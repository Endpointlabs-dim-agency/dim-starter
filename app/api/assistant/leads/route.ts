import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isOwner } from "@/lib/owner-auth";
import { listLeads, updateLeadStatus } from "@/lib/assistant/store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isOwner()))
    return NextResponse.json({ error: "owner access required" }, { status: 401 });
  return NextResponse.json({ leads: await listLeads() });
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "replied", "archived"]),
});

export async function POST(req: NextRequest) {
  if (!(await isOwner()))
    return NextResponse.json({ error: "owner access required" }, { status: 401 });
  const parsed = statusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  await updateLeadStatus(parsed.data.id, parsed.data.status);
  return NextResponse.json({ ok: true });
}
