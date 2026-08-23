import { NextRequest, NextResponse } from "next/server";
import { assistantStream, type AiMessage } from "@/lib/assistant/gateway";
import { getSiteText } from "@/lib/assistant/siteReader";
import {
  assistantSystemPrompt,
  CONTACT_FORM_MARKER,
  DEFAULT_ASSISTANT_NAME,
  DEFAULT_WELCOME,
  QUICK_PROMPTS,
} from "@/lib/assistant/knowledge";
import {
  appendConversation,
  countVisitorMessagesToday,
  getSettings,
} from "@/lib/assistant/store";

export const runtime = "nodejs";

// Light per-visitor daily cap so one visitor can't drain the app's shared
// daily AI allowance. The gateway's own per-app cap is the hard ceiling.
const VISITOR_DAILY_LIMIT = 20;
const MAX_TURNS = 8;
const MAX_MESSAGE_CHARS = 1500;

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
  });
}

interface ChatBody {
  messages?: Array<{ role?: string; content?: string }>;
  visitorKey?: string;
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

  // Behind proxies (Vercel, the live-preview session) the parsed request
  // origin is not reliably the public host — build it from forwarded
  // headers, same lesson as the owner-unlock relative redirect.
  const readerHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const readerProto = req.headers.get("x-forwarded-proto") ?? "https";
  const siteText = readerHost
    ? await getSiteText(`${readerProto}://${readerHost}`).catch(() => "")
    : "";
  const upstream = await assistantStream(history, {
    system: await assistantSystemPrompt(settings, siteText),
    maxTokens: 600,
    temperature: 0.4,
  });

  if (upstream.status === 429) return NextResponse.json({ limited: true });
  if (!upstream.ok || !upstream.body)
    return NextResponse.json({ error: "assistant unavailable" }, { status: 502 });

  const userTurn = history[history.length - 1].content;
  const upstreamBody = upstream.body;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();
      let sseBuf = "";
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

      try {
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
                  delta?: { type?: string; text?: string };
                  message?: { usage?: { input_tokens?: number } };
                  usage?: { output_tokens?: number };
                };
                if (
                  json.type === "content_block_delta" &&
                  json.delta?.type === "text_delta" &&
                  json.delta.text
                ) {
                  fullText += json.delta.text;
                  pending += json.delta.text;
                  flush(false);
                }
                if (json.type === "message_start" && json.message?.usage?.input_tokens)
                  tokensIn = json.message.usage.input_tokens;
                if (json.type === "message_delta" && json.usage?.output_tokens)
                  tokensOut = json.usage.output_tokens;
              } catch {
                // Not JSON we care about — skip.
              }
            }
          }
        }
        flush(true);
        if (settings.captureEnabled && fullText.includes(CONTACT_FORM_MARKER))
          controller.enqueue(line({ contactForm: true }));
        if (tokensIn || tokensOut)
          controller.enqueue(line({ usage: { in: tokensIn, out: tokensOut } }));
        controller.enqueue(line({ done: true }));

        const now = new Date().toISOString();
        const cleaned = fullText.split(CONTACT_FORM_MARKER).join("").trim();
        try {
          await appendConversation(visitorKey, [
            { role: "user", content: userTurn, at: now },
            { role: "assistant", content: cleaned, at: now },
          ]);
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
