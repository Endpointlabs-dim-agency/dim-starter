"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, MessagesSquare, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AssistantConversation,
  AssistantLead,
  AssistantSettings,
} from "@/lib/assistant/store";
import { cn } from "@/lib/utils";

const STATUS_ORDER = ["new", "replied", "archived"] as const;

function nextStatus(s: string): string {
  const i = STATUS_ORDER.indexOf(s as (typeof STATUS_ORDER)[number]);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AssistantAdmin({
  leads,
  conversations,
  settings,
}: {
  leads: AssistantLead[];
  conversations: AssistantConversation[];
  settings: AssistantSettings;
}) {
  const router = useRouter();
  const [busyLead, setBusyLead] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState(settings.notifyEmail ?? "");
  const [enabled, setEnabled] = useState(settings.enabled);
  const [assistantName, setAssistantName] = useState(settings.assistantName ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage ?? "");
  const [promptsText, setPromptsText] = useState((settings.quickPrompts ?? []).join("\n"));
  const [tone, setTone] = useState<"friendly" | "professional" | "playful">(settings.tone);
  const [customInstructions, setCustomInstructions] = useState(settings.customInstructions ?? "");
  const [extraKnowledge, setExtraKnowledge] = useState(settings.extraKnowledge ?? "");
  const [formIntro, setFormIntro] = useState(settings.formIntro ?? "");
  const [captureEnabled, setCaptureEnabled] = useState(settings.captureEnabled);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cycleStatus = async (lead: AssistantLead) => {
    setBusyLead(lead.id);
    try {
      await fetch("/api/assistant/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, status: nextStatus(lead.status) }),
      });
      router.refresh();
    } finally {
      setBusyLead(null);
    }
  };

  const saveSettingsForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveNote(null);
    try {
      const res = await fetch("/api/assistant/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyEmail: notifyEmail.trim(),
          enabled,
          assistantName: assistantName.trim() || null,
          welcomeMessage: welcomeMessage.trim() || null,
          quickPrompts: promptsText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 4),
          tone,
          customInstructions: customInstructions.trim() || null,
          extraKnowledge: extraKnowledge.trim() || null,
          formIntro: formIntro.trim() || null,
          captureEnabled,
        }),
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      setSaveNote(res.ok && j?.ok ? "Saved." : (j?.error ?? "Couldn't save — try again."));
      router.refresh();
    } catch {
      setSaveNote("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">OWNER AREA</p>
        <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
          Site assistant
        </h1>
        <p className="mt-1 text-muted-foreground">
          Messages people left through the chat, recent conversations, and the
          assistant&apos;s settings.
        </p>
      </div>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">
            <Inbox className="mr-1.5 h-4 w-4" /> Messages ({leads.length})
          </TabsTrigger>
          <TabsTrigger value="conversations">
            <MessagesSquare className="mr-1.5 h-4 w-4" /> Conversations ({conversations.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="mr-1.5 h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4 space-y-3">
          {leads.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No messages yet. When a visitor leaves their details in the chat,
                they&apos;ll show up here.
              </CardContent>
            </Card>
          )}
          {leads.map((lead) => (
            <Card key={lead.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{lead.name}</p>
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {lead.email}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {lead.message}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyLead === lead.id}
                  onClick={() => cycleStatus(lead)}
                  className="shrink-0"
                >
                  <Badge
                    variant={lead.status === "new" ? "default" : "secondary"}
                    className={cn(lead.status === "archived" && "opacity-60")}
                  >
                    {lead.status}
                  </Badge>
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="conversations" className="mt-4 space-y-3">
          {conversations.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No conversations yet.
              </CardContent>
            </Card>
          )}
          {conversations.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  {formatDate(c.createdAt)}
                  {c.escalated && <Badge>left a message</Badge>}
                </CardTitle>
                <CardDescription className="text-xs">
                  Visitor {c.visitorKey.slice(0, 8)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {c.transcript.map((t, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                      t.role === "user"
                        ? "ml-auto bg-primary/10"
                        : "bg-muted/40",
                    )}
                  >
                    {t.content}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <form onSubmit={saveSettingsForm} className="max-w-lg space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Personality</CardTitle>
                <CardDescription>
                  How the assistant introduces itself and talks to visitors.
                  Changes apply right away — no rebuild.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium" htmlFor="assistant-name">
                    Assistant name
                  </label>
                  <Input
                    id="assistant-name"
                    placeholder="Your assistant's name"
                    maxLength={60}
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="welcome-message">
                    Welcome message
                  </label>
                  <Textarea
                    id="welcome-message"
                    placeholder="The first thing visitors see when they open the chat."
                    maxLength={300}
                    rows={2}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="quick-prompts">
                    Suggested questions
                  </label>
                  <Textarea
                    id="quick-prompts"
                    placeholder={"One per line, up to 4 — shown as tappable chips."}
                    rows={3}
                    value={promptsText}
                    onChange={(e) => setPromptsText(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="tone">
                    Tone
                  </label>
                  <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                    <SelectTrigger id="tone" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="custom-instructions">
                    Standing instructions
                  </label>
                  <Textarea
                    id="custom-instructions"
                    placeholder={'Things it should always do — e.g. "Always mention we are closed Sundays."'}
                    maxLength={1000}
                    rows={3}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">What it knows</CardTitle>
                <CardDescription>
                  The assistant already knows everything on the site. Add facts
                  it should also know, or corrections for wrong answers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="extra-knowledge"
                  placeholder={'Facts visitors ask about that are not on the site yet'}
                  maxLength={2000}
                  rows={5}
                  value={extraKnowledge}
                  onChange={(e) => setExtraKnowledge(e.target.value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Messages from visitors</CardTitle>
                <CardDescription>
                  The contact form inside the chat, and where its messages go.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Let visitors leave a message</p>
                    <p className="text-xs text-muted-foreground">
                      Off hides the contact form everywhere in the chat.
                    </p>
                  </div>
                  <Switch checked={captureEnabled} onCheckedChange={setCaptureEnabled} />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="form-intro">
                    Form title
                  </label>
                  <Input
                    id="form-intro"
                    placeholder="Send us a message"
                    maxLength={200}
                    value={formIntro}
                    onChange={(e) => setFormIntro(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="notify-email">
                    Email me when someone leaves a message
                  </label>
                  <Input
                    id="notify-email"
                    type="email"
                    placeholder="you@example.com (leave blank for no emails)"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 py-4">
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Assistant is on</p>
                    <p className="text-xs text-muted-foreground">
                      Turning it off hides the chat bubble for everyone.
                    </p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>
                {saveNote && <p className="text-sm text-muted-foreground">{saveNote}</p>}
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save settings"}
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </main>
  );
}
