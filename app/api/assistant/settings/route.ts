import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isOwner } from "@/lib/owner-auth";
import { getSettings, saveSettings } from "@/lib/assistant/store";
import { ACTIONS } from "@/lib/assistant/actions";
import { hasDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isOwner()))
    return NextResponse.json({ error: "owner access required" }, { status: 401 });
  // storage tells the platform whether these settings are REAL (stored) or
  // just defaults from an app with no database yet — a storage-less origin
  // must never be used as the source of truth.
  const settings = await getSettings();
  // What the assistant can do on THIS app, for the owner's panel: the
  // registry the build agent maintains, with the owner's on/off state.
  const actions = ACTIONS.map((a) => ({
    name: a.name,
    description: a.description,
    scope: a.scope,
    confirm: Boolean(a.confirm),
    enabled: !settings.disabledActions.includes(a.name),
  }));
  return NextResponse.json({ settings, storage: hasDb(), actions });
}

const optionalText = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).optional();

const settingsSchema = z.object({
  notifyEmail: z.union([z.string().trim().email().max(200), z.literal(""), z.null()]),
  enabled: z.boolean(),
  assistantName: optionalText(60),
  welcomeMessage: optionalText(300),
  quickPrompts: z
    .union([z.array(z.string().trim().min(1).max(80)).max(4), z.null()])
    .optional(),
  tone: z.enum(["friendly", "professional", "playful"]).optional(),
  customInstructions: optionalText(1000),
  extraKnowledge: optionalText(2000),
  formIntro: optionalText(200),
  captureEnabled: z.boolean().optional(),
  disabledActions: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
});

export async function POST(req: NextRequest) {
  if (!(await isOwner()))
    return NextResponse.json({ error: "owner access required" }, { status: 401 });
  const parsed = settingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Something in the settings doesn't look right — check the fields and try again." },
      { status: 400 },
    );
  if (!hasDb())
    return NextResponse.json(
      { error: "This app doesn't have storage yet.", code: "no-database" },
      { status: 503 },
    );
  const current = await getSettings();
  const d = parsed.data;
  const text = (v: string | null | undefined, prev: string | null) =>
    v === undefined ? prev : v ? v : null;
  await saveSettings({
    notifyEmail: d.notifyEmail ? d.notifyEmail : null,
    enabled: d.enabled,
    assistantName: text(d.assistantName, current.assistantName),
    welcomeMessage: text(d.welcomeMessage, current.welcomeMessage),
    quickPrompts:
      d.quickPrompts === undefined
        ? current.quickPrompts
        : d.quickPrompts?.length
          ? d.quickPrompts
          : null,
    tone: d.tone ?? current.tone,
    customInstructions: text(d.customInstructions, current.customInstructions),
    extraKnowledge: text(d.extraKnowledge, current.extraKnowledge),
    formIntro: text(d.formIntro, current.formIntro),
    captureEnabled: d.captureEnabled ?? current.captureEnabled,
    disabledActions: d.disabledActions ?? current.disabledActions,
  });
  return NextResponse.json({ ok: true });
}
