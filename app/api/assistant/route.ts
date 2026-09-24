import { NextRequest, NextResponse } from "next/server";
import {
  assistantStream,
  type AiContentBlock,
  type AiMessage,
  type AiTool,
  type AiToolUseBlock,
} from "@/lib/assistant/gateway";
import { getSiteText } from "@/lib/assistant/siteReader";
import {
  assistantSystemPrompt,
  CONTACT_FORM_MARKER,
  DEFAULT_ASSISTANT_NAME,
  DEFAULT_WELCOME,
  QUICK_PROMPTS,
} from "@/lib/assistant/knowledge";
import { ACTIONS, type ActionScope, type AssistantAction } from "@/lib/assistant/actions";
import { isOwner } from "@/lib/owner-auth";
import {
  appendConversation,
  countVisitorActionsToday,
  countVisitorMessagesToday,
  getSettings,
  type AssistantTurn,
} from "@/lib/assistant/store";

export const runtime = "nodejs";

// Light per-visitor daily cap so one visitor can't drain the app's shared
// daily AI allowance. The gateway's own per-app cap is the hard ceiling.
const VISITOR_DAILY_LIMIT = 20;
// Executed actions per visitor per day (owner is uncapped). Bookings and
// orders are real side effects — the cap is the backstop behind Confirm.
const VISITOR_DAILY_ACTIONS = 10;
const MAX_TURNS = 8;
const MAX_MESSAGE_CHARS = 1500;
// Tool rounds per visitor message: check → book → answer is three; more is
// a loop, and each round is a metered gateway request.
const MAX_TOOL_ROUNDS = 4;
const ACTION_TIMEOUT_MS = 8_000;
const RESULT_MAX_CHARS = 4_000;

const encoder = new TextEncoder();
const line = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    enabled: settings.enabled,
    name: settings.assistantName ?? DEFAULT_ASSISTANT_NAME,
    welcome: settings.welcomeMessage ?? DEFAULT_WELCOME,
    prompts: settings.quickPrompts ?? QUICK_PROMPTS,
    captureEnabled: settings.captureEnabled,
    formIntro: settings.formIntro,
    actions: ACTIONS.filter((a) => a.scope === "visitor").length > 0,
  });
}

interface ChatBody {
  messages?: Array<{ role?: string; content?: string }>;
  visitorKey?: string;
  // The visitor tapped Confirm on the named action's summary. Applies to
  // this request only, and only to that action.
  confirm?: { name?: string };
}

const humanize = (name: string) =>
  name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function toolsFor(scope: ActionScope): { actions: AssistantAction[]; tools: AiTool[] } {
  const seen = new Set<string>();
  const actions = ACTIONS.filter((a) => {
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(a.name) || seen.has(a.name)) return false;
    seen.add(a.name);
    return a.scope === "visitor" || scope === "owner";
  });
  return {
    actions,
    tools: actions.map((a) => ({
      name: a.name,
      description: a.description.slice(0, 600),
      input_schema: a.input,
    })),
  };
}

function actionRules(scope: ActionScope, actions: AssistantAction[]): string {
  if (!actions.length) return "";
  const confirmables = actions.filter((a) => a.confirm).map((a) => a.name);
  return `
WHAT YOU CAN DO:
- You have tools that act on this site (${actions.map((a) => a.name).join(", ")}). Use them whenever the visitor wants something done, and use them to look facts up instead of guessing. Say what you did in plain words afterwards.
- Collect what an action needs (name, date, time, details) in conversation before calling it. Never invent a value the visitor did not give you.
${confirmables.length ? `- ${confirmables.join(", ")}: these change real data. The first call returns needsConfirmation with a summary — repeat that summary to the visitor in one sentence and ask them to tap Confirm. Do not call it again until they have confirmed.` : ""}
- If an action fails, say so plainly and offer the next best option. Never claim something was booked, sent, or saved unless the tool result says ok.
${scope === "owner" ? "- OWNER MODE: you are talking to the site's owner (they unlocked owner access). Answer questions about submitted data from the owner tools and carry out their requests. Be direct and specific." : "- You are talking to a site visitor. Owner-only data (other people's bookings, messages, contact details) is never available to them."}`;
}

async function runWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Action timed out")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const visitorKey = String(body.visitorKey ?? "");
  if (!/^[A-Za-z0-9-]{8,64}$/.test(visitorKey))
    return NextResponse.json({ error: "bad request" }, { status: 400 });

  const history: AiMessage[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
  if (!history.length || history[history.length - 1].role !== "user")
    return NextResponse.json({ error: "bad request" }, { status: 400 });

  const settings = await getSettings();
  if (!settings.enabled)
    return NextResponse.json({ error: "assistant is off" }, { status: 404 });

  if ((await countVisitorMessagesToday(visitorKey)) >= VISITOR_DAILY_LIMIT) {
    return NextResponse.json({ limited: true });
  }

  const scope: ActionScope = (await isOwner().catch(() => false)) ? "owner" : "visitor";
  const { actions, tools } = toolsFor(scope);
  const confirmedName =
    typeof body.confirm?.name === "string" ? body.confirm.name : null;

  // Behind proxies (Vercel, the live-preview session) the parsed request
  // origin is not reliably the public host — build it from forwarded
  // headers, same lesson as the owner-unlock relative redirect.
  const readerHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const readerProto = req.headers.get("x-forwarded-proto") ?? "https";
  const siteText = readerHost
    ? await getSiteText(`${readerProto}://${readerHost}`).catch(() => "")
    : "";
  const system =
    (await assistantSystemPrompt(settings, siteText)) + actionRules(scope, actions);

  const userTurn = history[history.length - 1].content as string;
  const startedAt = new Date().toISOString();
  const transcript: AssistantTurn[] = [{ role: "user", content: userTurn, at: startedAt }];
  let actionsUsed = actions.length && scope === "visitor"
    ? await countVisitorActionsToday(visitorKey)
    : 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";
      let pending = "";
      let tokensIn = 0;
      let tokensOut = 0;

      // Emits pending text, holding back anything that could be the start of
      // the contact-form marker (it can arrive split across deltas).
      const flush = (final: boolean) => {
        let text = pending;
        text = text.split(CONTACT_FORM_MARKER).join("");
        if (!final) {
          let hold = 0;
          for (let k = Math.min(CONTACT_FORM_MARKER.length - 1, text.length); k > 0; k--) {
            if (text.endsWith(CONTACT_FORM_MARKER.slice(0, k))) {
              hold = k;
              break;
            }
          }
          if (hold > 0) {
            pending = text.slice(text.length - hold);
            text = text.slice(0, text.length - hold);
          } else {
            pending = "";
          }
        } else {
          pending = "";
        }
        if (text) controller.enqueue(line({ t: text }));
      };

      // One model round: streams text to the visitor as it arrives and
      // collects any tool calls. Returns the assistant blocks + stop reason.
      const round = async (
        messages: AiMessage[],
      ): Promise<{ blocks: AiContentBlock[]; stop: string; limited: boolean; failed: boolean }> => {
        const upstream = await assistantStream(messages, {
          system,
          maxTokens: 700,
          temperature: 0.4,
          tools,
          model: tools.length ? "actions" : "fast",
        });
        if (upstream.status === 429) return { blocks: [], stop: "", limited: true, failed: false };
        if (!upstream.ok || !upstream.body) return { blocks: [], stop: "", limited: false, failed: true };

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let sseBuf = "";
        let stop = "";
        const blocks: AiContentBlock[] = [];
        let roundText = "";
        const partialJson = new Map<number, string>();
        const toolAt = new Map<number, AiToolUseBlock>();

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuf += decoder.decode(value, { stream: true });
          const events = sseBuf.split("\n\n");
          sseBuf = events.pop() ?? "";
          for (const evt of events) {
            for (const l of evt.split("\n")) {
              if (!l.startsWith("data:")) continue;
              const payload = l.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload) as {
                  type?: string;
                  index?: number;
                  content_block?: { type?: string; id?: string; name?: string };
                  delta?: {
                    type?: string;
                    text?: string;
                    partial_json?: string;
                    stop_reason?: string;
                  };
                  message?: { usage?: { input_tokens?: number } };
                  usage?: { input_tokens?: number; output_tokens?: number };
                };
                if (
                  json.type === "content_block_start" &&
                  json.content_block?.type === "tool_use" &&
                  typeof json.index === "number"
                ) {
                  toolAt.set(json.index, {
                    type: "tool_use",
                    id: json.content_block.id ?? `call_${json.index}`,
                    name: json.content_block.name ?? "",
                    input: {},
                  });
                  partialJson.set(json.index, "");
                }
                if (json.type === "content_block_delta" && typeof json.index === "number") {
                  if (json.delta?.type === "text_delta" && json.delta.text) {
                    roundText += json.delta.text;
                    fullText += json.delta.text;
                    pending += json.delta.text;
                    flush(false);
                  }
                  if (json.delta?.type === "input_json_delta" && toolAt.has(json.index))
                    partialJson.set(
                      json.index,
                      (partialJson.get(json.index) ?? "") + (json.delta.partial_json ?? ""),
                    );
                }
                if (json.type === "content_block_stop" && typeof json.index === "number") {
                  const tool = toolAt.get(json.index);
                  if (tool) {
                    const raw = partialJson.get(json.index) ?? "";
                    try {
                      const parsed = raw.trim() ? (JSON.parse(raw) as unknown) : {};
                      tool.input =
                        parsed && typeof parsed === "object" && !Array.isArray(parsed)
                          ? (parsed as Record<string, unknown>)
                          : {};
                    } catch {
                      tool.input = {};
                    }
                    blocks.push(tool);
                  }
                }
                if (json.type === "message_start" && json.message?.usage?.input_tokens)
                  tokensIn += json.message.usage.input_tokens;
                if (json.type === "message_delta") {
                  if (json.usage?.input_tokens) tokensIn += json.usage.input_tokens;
                  if (json.usage?.output_tokens) tokensOut += json.usage.output_tokens;
                  if (json.delta?.stop_reason) stop = json.delta.stop_reason;
                }
              } catch {
                // Not JSON we care about — skip.
              }
            }
          }
        }
        if (roundText.trim()) blocks.unshift({ type: "text", text: roundText });
        return { blocks, stop, limited: false, failed: false };
      };

      const execute = async (call: AiToolUseBlock): Promise<{ content: string; isError: boolean }> => {
        const action = actions.find((a) => a.name === call.name);
        if (!action) return { content: JSON.stringify({ ok: false, reason: "Unknown action" }), isError: true };
        const label = humanize(action.name);
        if (action.confirm && confirmedName !== action.name) {
          let summary = "";
          try {
            summary = action.summarize ? action.summarize(call.input) : `${label}.`;
          } catch {
            summary = `${label}.`;
          }
          summary = summary.slice(0, 300);
          controller.enqueue(line({ confirm: { name: action.name, summary } }));
          return {
            content: JSON.stringify({
              needsConfirmation: true,
              summary,
              instruction:
                "Not done yet. Tell the visitor exactly this summary in one sentence and ask them to tap Confirm. Do not call this action again until they confirm.",
            }),
            isError: false,
          };
        }
        if (scope === "visitor" && actionsUsed >= VISITOR_DAILY_ACTIONS)
          return {
            content: JSON.stringify({
              ok: false,
              reason: "This visitor reached today's action limit. Offer to take their details instead.",
            }),
            isError: true,
          };
        controller.enqueue(line({ action: { name: action.name, label, status: "running" } }));
        try {
          const result = await runWithTimeout(
            action.run(call.input, { scope, visitorKey, confirmed: confirmedName === action.name }),
            ACTION_TIMEOUT_MS,
          );
          const content = JSON.stringify(result ?? { ok: true }).slice(0, RESULT_MAX_CHARS);
          const ok = !(result && typeof result === "object" && (result as { ok?: unknown }).ok === false);
          if (ok) actionsUsed += 1;
          controller.enqueue(line({ action: { name: action.name, label, status: ok ? "done" : "failed" } }));
          transcript.push({
            role: "assistant",
            content: `[${ok ? "Did" : "Tried"}: ${label}] ${content.slice(0, 300)}`,
            at: new Date().toISOString(),
            action: { name: action.name, ok },
          });
          return { content, isError: false };
        } catch (err) {
          const reason = err instanceof Error ? err.message : "Action failed";
          controller.enqueue(line({ action: { name: action.name, label, status: "failed" } }));
          transcript.push({
            role: "assistant",
            content: `[Tried: ${label}] ${reason.slice(0, 300)}`,
            at: new Date().toISOString(),
            action: { name: action.name, ok: false },
          });
          return { content: JSON.stringify({ ok: false, reason: reason.slice(0, 300) }), isError: true };
        }
      };

      try {
        const messages: AiMessage[] = [...history];
        for (let i = 0; i <= MAX_TOOL_ROUNDS; i++) {
          const r = await round(messages);
          if (r.limited) {
            controller.enqueue(line({ limited: true }));
            break;
          }
          if (r.failed) {
            if (!fullText) controller.enqueue(line({ error: true }));
            break;
          }
          const calls = r.blocks.filter((b): b is AiToolUseBlock => b.type === "tool_use");
          if (r.stop !== "tool_use" || !calls.length || i === MAX_TOOL_ROUNDS) break;
          const results: AiContentBlock[] = [];
          for (const call of calls) {
            const { content, isError } = await execute(call);
            results.push({ type: "tool_result", tool_use_id: call.id, content, is_error: isError || undefined });
          }
          messages.push({ role: "assistant", content: r.blocks });
          messages.push({ role: "user", content: results });
          // Text spoken before a tool call ("Let me check…") gets its own
          // line so the continuation doesn't run into it.
          if (r.blocks[0]?.type === "text" && !fullText.endsWith("\n")) {
            fullText += "\n";
            pending += "\n";
            flush(false);
          }
        }
        flush(true);
        if (settings.captureEnabled && fullText.includes(CONTACT_FORM_MARKER))
          controller.enqueue(line({ contactForm: true }));
        if (tokensIn || tokensOut)
          controller.enqueue(line({ usage: { in: tokensIn, out: tokensOut } }));
        controller.enqueue(line({ done: true }));

        const cleaned = fullText.split(CONTACT_FORM_MARKER).join("").trim();
        transcript.push({ role: "assistant", content: cleaned, at: new Date().toISOString() });
        try {
          await appendConversation(visitorKey, transcript);
        } catch {
          // Logging must never break the visitor's chat.
        }
      } catch {
        controller.enqueue(line({ error: true }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
