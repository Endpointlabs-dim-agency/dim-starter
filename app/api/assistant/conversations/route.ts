import { NextResponse } from "next/server";
import { isOwner } from "@/lib/owner-auth";
import { listConversations } from "@/lib/assistant/store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isOwner()))
    return NextResponse.json({ error: "owner access required" }, { status: 401 });
  return NextResponse.json({ conversations: await listConversations() });
}
