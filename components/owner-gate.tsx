import type { ReactNode } from "react";
import { isOwner } from "@/lib/owner-auth";
import { OwnerGateForm } from "@/components/owner-gate-form";

// Wrap any page (or section) that displays PERSONAL DATA, whoever entered it
// — waitlists, form submissions, bookings, orders, messages, and equally the
// owner's own records (calendar, schedule, clients, notes). The test is
// whether a stranger with the URL should be able to read or change it, not
// who typed it in. Renders
// children only for the verified owner; everyone else sees the passcode
// screen. Server component: the protected markup is never sent to the
// browser for non-owners.
export async function OwnerGate({
  children,
  title = "Owner access",
}: {
  children: ReactNode;
  title?: string;
}) {
  if (await isOwner()) return <>{children}</>;
  return <OwnerGateForm title={title} />;
}
