import { OwnerGate } from "@/components/owner-gate";
import { AssistantAdmin } from "@/components/assistant-admin";
import { getSettings, listConversations, listLeads } from "@/lib/assistant/store";
import { ACTIONS } from "@/lib/assistant/actions";

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
  const actions = ACTIONS.map((a) => ({
    name: a.name,
    description: a.description,
    scope: a.scope,
    confirm: Boolean(a.confirm),
  }));
  return (
    <AssistantAdmin
      leads={leads}
      conversations={conversations}
      settings={settings}
      actions={actions}
    />
  );
}
