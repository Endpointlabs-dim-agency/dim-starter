// The assistant's own door to the EndpointLabs AI gateway — deliberately
// self-contained so installing the assistant never depends on, or modifies,
// the app's lib/ai.ts. Marks traffic as assistant-purpose: the platform
// meters it separately from the app's own AI budget.
// SERVER-SIDE ONLY. Never import in a client component.

const GATEWAY_URL =
  process.env.ENDPOINTLABS_AI_URL ??
  "https://app.endpointlabs.io/api/ai-gateway/messages";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export async function assistantStream(
  messages: AiMessage[],
  opts: { system?: string; maxTokens?: number; temperature?: number } = {},
): Promise<Response> {
  const key = process.env.ENDPOINTLABS_AI_KEY;
  if (!key)
    throw new Error(
      "ENDPOINTLABS_AI_KEY is not set — the assistant is unavailable in this environment.",
    );
  return fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "fast",
      system: opts.system,
      messages,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature,
      stream: true,
      purpose: "assistant",
    }),
  });
}
