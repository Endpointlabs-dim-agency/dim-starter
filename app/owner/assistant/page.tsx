import { OwnerGate } from "@/components/owner-gate";
import { AssistantAdmin } from "@/components/assistant-admin";
import { getSettings, listConversations, listLeads } from "@/lib/assistant/store";

export const dynamic = "force-dynamic";

export default async function OwnerAssistantPage() {
  return (
    <OwnerGate title="Site assistant">
      <AdminLoader />
    </OwnerGate>
  );
}

async function AdminLoader() {
  const [leads, conversations, settings] = await Promise.all([
    listLeads(),
    listConversations(),
    getSettings(),
  ]);
  return (
    <AssistantAdmin leads={leads} conversations={conversations} settings={settings} />
  );
}
