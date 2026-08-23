import { db, hasDb } from "@/lib/db";

// All assistant database access. Every function degrades gracefully when no
// database is provisioned yet: chat still works, capture/logging just skips.

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface AssistantSettings {
  notifyEmail: string | null;
  enabled: boolean;
  assistantName: string | null;
  welcomeMessage: string | null;
  quickPrompts: string[] | null;
  tone: "friendly" | "professional" | "playful";
  customInstructions: string | null;
  extraKnowledge: string | null;
  formIntro: string | null;
  captureEnabled: boolean;
}

// enabled:false — a brand-new app has no settings row (often no database
// yet); the assistant stays invisible until the owner turns it on.
export const DEFAULT_SETTINGS: AssistantSettings = {
  notifyEmail: null,
  enabled: false,
  assistantName: null,
  welcomeMessage: null,
  quickPrompts: null,
  tone: "friendly",
  customInstructions: null,
  extraKnowledge: null,
  formIntro: null,
  captureEnabled: true,
};

function parsePrompts(value: unknown): string[] | null {
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(v)) return null;
  const out = v.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return out.length ? out : null;
}

export interface AssistantLead {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  message: string;
  sourcePage: string | null;
  status: string;
}

export interface AssistantConversation {
  id: string;
  createdAt: string;
  visitorKey: string;
  transcript: AssistantTurn[];
  escalated: boolean;
}

// jsonb can arrive as a string through the pooled connection, and elements
// can themselves be stringified chunks — normalize everything to turns.
function parseTurns(value: unknown): AssistantTurn[] {
  if (typeof value === "string") {
    try {
      return parseTurns(JSON.parse(value) as unknown);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) {
    const out: AssistantTurn[] = [];
    for (const el of value) {
      if (typeof el === "string") out.push(...parseTurns(el));
      else if (el && typeof el === "object" && "role" in el)
        out.push(el as AssistantTurn);
    }
    return out;
  }
  return [];
}

export async function getSettings(): Promise<AssistantSettings> {
  if (!hasDb()) return DEFAULT_SETTINGS;
  try {
    const rows = await db()`
      select notify_email, enabled, assistant_name, welcome_message,
             quick_prompts, tone, custom_instructions, extra_knowledge,
             form_intro, capture_enabled
      from assistant_settings where id = 1`;
    if (!rows.length) return DEFAULT_SETTINGS;
    const r = rows[0];
    const tone = ["friendly", "professional", "playful"].includes(String(r.tone))
      ? (String(r.tone) as AssistantSettings["tone"])
      : "friendly";
    return {
      notifyEmail: (r.notify_email as string | null) ?? null,
      enabled: Boolean(r.enabled),
      assistantName: (r.assistant_name as string | null) ?? null,
      welcomeMessage: (r.welcome_message as string | null) ?? null,
      quickPrompts: parsePrompts(r.quick_prompts),
      tone,
      customInstructions: (r.custom_instructions as string | null) ?? null,
      extraKnowledge: (r.extra_knowledge as string | null) ?? null,
      formIntro: (r.form_intro as string | null) ?? null,
      captureEnabled: r.capture_enabled === null ? true : Boolean(r.capture_enabled),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: AssistantSettings): Promise<void> {
  const sql = db();
  const prompts = s.quickPrompts?.length
    ? sql.json(s.quickPrompts as unknown as Parameters<typeof sql.json>[0])
    : null;
  await sql`
    insert into assistant_settings
      (id, notify_email, enabled, assistant_name, welcome_message,
       quick_prompts, tone, custom_instructions, extra_knowledge,
       form_intro, capture_enabled)
    values
      (1, ${s.notifyEmail}, ${s.enabled}, ${s.assistantName},
       ${s.welcomeMessage}, ${prompts}, ${s.tone}, ${s.customInstructions},
       ${s.extraKnowledge}, ${s.formIntro}, ${s.captureEnabled})
    on conflict (id) do update set
      notify_email = ${s.notifyEmail},
      enabled = ${s.enabled},
      assistant_name = ${s.assistantName},
      welcome_message = ${s.welcomeMessage},
      quick_prompts = ${prompts},
      tone = ${s.tone},
      custom_instructions = ${s.customInstructions},
      extra_knowledge = ${s.extraKnowledge},
      form_intro = ${s.formIntro},
      capture_enabled = ${s.captureEnabled}`;
}

export async function countVisitorMessagesToday(visitorKey: string): Promise<number> {
  if (!hasDb()) return 0;
  try {
    const rows = await db()`
      select transcript from assistant_conversations
      where visitor_key = ${visitorKey} and created_at >= now()::date`;
    let n = 0;
    for (const row of rows) {
      n += parseTurns(row.transcript).filter((t) => t.role === "user").length;
    }
    return n;
  } catch {
    return 0;
  }
}

export async function appendConversation(
  visitorKey: string,
  turns: AssistantTurn[],
): Promise<void> {
  if (!hasDb() || turns.length === 0) return;
  const sql = db();
  const rows = await sql`
    select id from assistant_conversations
    where visitor_key = ${visitorKey} and created_at >= now()::date
    order by created_at desc limit 1`;
  if (rows.length) {
    // Guard the concat: a legacy scalar-string transcript would turn || into
    // string concatenation — reset those to an array first.
    await sql`
      update assistant_conversations
      set transcript = (case when jsonb_typeof(transcript) = 'array' then transcript else '[]'::jsonb end) || ${sql.json(turns as unknown as Parameters<typeof sql.json>[0])},
          updated_at = now()
      where id = ${rows[0].id as string}`;
  } else {
    await sql`
      insert into assistant_conversations (visitor_key, transcript)
      values (${visitorKey}, ${sql.json(turns as unknown as Parameters<typeof sql.json>[0])})`;
  }
}

export async function markEscalated(visitorKey: string): Promise<void> {
  if (!hasDb()) return;
  await db()`
    update assistant_conversations set escalated = true, updated_at = now()
    where visitor_key = ${visitorKey} and created_at >= now()::date`;
}

export async function insertLead(lead: {
  name: string;
  email: string;
  message: string;
  sourcePage: string | null;
}): Promise<void> {
  await db()`
    insert into assistant_leads (name, email, message, source_page)
    values (${lead.name}, ${lead.email}, ${lead.message}, ${lead.sourcePage})`;
}

export async function listLeads(): Promise<AssistantLead[]> {
  if (!hasDb()) return [];
  const rows = await db()`
    select id, created_at, name, email, message, source_page, status
    from assistant_leads order by created_at desc limit 200`;
  return rows.map((r) => ({
    id: String(r.id),
    createdAt: new Date(r.created_at as string).toISOString(),
    name: String(r.name),
    email: String(r.email),
    message: String(r.message),
    sourcePage: (r.source_page as string | null) ?? null,
    status: String(r.status),
  }));
}

export async function updateLeadStatus(id: string, status: string): Promise<void> {
  await db()`update assistant_leads set status = ${status} where id = ${id}`;
}

export async function listConversations(): Promise<AssistantConversation[]> {
  if (!hasDb()) return [];
  const rows = await db()`
    select id, created_at, visitor_key, transcript, escalated
    from assistant_conversations order by created_at desc limit 50`;
  return rows.map((r) => ({
    id: String(r.id),
    createdAt: new Date(r.created_at as string).toISOString(),
    visitorKey: String(r.visitor_key),
    transcript: parseTurns(r.transcript),
    escalated: Boolean(r.escalated),
  }));
}
