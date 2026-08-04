"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { verifyOwnerPasscode, type OwnerAuthState } from "@/lib/owner-auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function OwnerGateForm({ title }: { title: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<OwnerAuthState, FormData>(
    verifyOwnerPasscode,
    {},
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
            <LockKeyhole className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="font-display">{title}</CardTitle>
          <CardDescription>
            This page is private to the business owner. Enter your owner
            passcode — you&apos;ll find it in the Keys panel of your
            EndpointLabs workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-3">
            <Input
              name="passcode"
              placeholder="Owner passcode"
              autoComplete="current-password"
              type="password"
              required
              autoFocus
            />
            {state.error ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Checking…" : "Unlock"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
