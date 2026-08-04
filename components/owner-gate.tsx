import type { ReactNode } from "react";
import { isOwner } from "@/lib/owner-auth";
import { OwnerGateForm } from "@/components/owner-gate-form";

// Wrap any page (or section) that displays data collected from visitors or
// users — waitlists, form submissions, bookings, orders, messages. Renders
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
