// Keyless AI door for this app. Calls the EndpointLabs AI gateway with this
// app's own key (ENDPOINTLABS_AI_KEY — injected by the platform, server-only).
// SERVER-SIDE ONLY: use from server actions and route handlers; never import
// in a client component and never expose the key to the browser.

const GATEWAY_URL =
  process.env.ENDPOINTLABS_AI_URL ??
  "https://app.endpointlabs.io/api/ai-gateway/messages";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiOptions {
  // "fast" (default — quick, cheap, great for most features) or "smart"
  // (stronger reasoning for hard tasks).
  model?: "fast" | "smart";
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

function buildBody(
  input: string | AiMessage[],
  opts: AiOptions,
  stream: boolean,
) {
  const messages =
    typeof input === "string" ? [{ role: "user", content: input }] : input;
  return JSON.stringify({
    model: opts.model ?? "fast",
    system: opts.system,
    messages,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature,
    stream,
  });
}

function headers(): Record<string, string> {
  const key = process.env.ENDPOINTLABS_AI_KEY;
  if (!key)
    throw new Error(
      "ENDPOINTLABS_AI_KEY is not set — AI features are unavailable in this environment.",
    );
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

// One-shot helper: returns the model's text reply.
export async function ai(
  input: string | AiMessage[],
  opts: AiOptions = {},
): Promise<string> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: headers(),
    body: buildBody(input, opts, false),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return (json.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

// Streaming helper for chat UIs: returns the raw SSE Response
// (Anthropic Messages streaming format) to pipe to the client.
export async function aiStream(
  input: string | AiMessage[],
  opts: AiOptions = {},
): Promise<Response> {
  return fetch(GATEWAY_URL, {
    method: "POST",
    headers: headers(),
    body: buildBody(input, opts, true),
  });
}
