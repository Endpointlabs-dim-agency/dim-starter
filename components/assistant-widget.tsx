"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Floating site assistant. Talks only to this app's own /api/assistant
// routes — no keys or external services in the browser.

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type ChatState = "idle" | "streaming" | "limited" | "error";

const VISITOR_KEY_STORAGE = "el-assistant-visitor";

function getVisitorKey(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY_STORAGE);
    if (existing && /^[A-Za-z0-9-]{8,64}$/.test(existing)) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY_STORAGE, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

const LIMIT_COPY =
  "The assistant is taking a breather until tomorrow — but you can still leave us a message below and we'll get back to you.";
const LIMIT_COPY_NO_FORM =
  "The assistant is taking a breather until tomorrow — come back then!";
const ERROR_COPY = "Sorry — didn't catch that. Give it another try.";

interface AssistantConfig {
  name: string;
  welcome: string;
  prompts: string[];
  captureEnabled: boolean;
  formIntro: string | null;
}

export function AssistantWidget() {
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<ChatState>("idle");
  const [showForm, setShowForm] = useState(false);
  // An action waiting on the visitor's Confirm tap, and the action currently
  // running (shown as a quiet status line under the reply).
  const [pendingConfirm, setPendingConfirm] = useState<{ name: string; summary: string } | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const [formDone, setFormDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const visitorKey = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshConfig = useCallback(() => {
    fetch("/api/assistant")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (j: {
          enabled?: boolean;
          name?: string;
          welcome?: string;
          prompts?: string[];
          captureEnabled?: boolean;
          formIntro?: string | null;
        } | null) => {
          if (!j) return;
          if (!j.enabled) {
            setConfig(null);
            return;
          }
          setConfig({
            name: j.name || "Assistant",
            welcome: j.welcome || "Hi! Ask me anything.",
            prompts: Array.isArray(j.prompts) ? j.prompts : [],
            captureEnabled: j.captureEnabled !== false,
            formIntro: j.formIntro ?? null,
          });
        },
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshConfig();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    // Embedded contexts (the builder preview iframe) never fire focus
    // events when settings change beside them — a gentle poll keeps the
    // bubble honest there too.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refreshConfig();
    }, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(timer);
    };
  }, [refreshConfig]);

  useEffect(() => {
    visitorKey.current = getVisitorKey();
    fetch("/api/assistant")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (j: {
          enabled?: boolean;
          name?: string;
          welcome?: string;
          prompts?: string[];
          captureEnabled?: boolean;
          formIntro?: string | null;
        } | null) => {
          if (j?.enabled) {
            setConfig({
              name: j.name || "Assistant",
              welcome: j.welcome || "Hi! Ask me anything.",
              prompts: Array.isArray(j.prompts) ? j.prompts : [],
              captureEnabled: j.captureEnabled !== false,
              formIntro: j.formIntro ?? null,
            });
          }
        },
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, state, showForm, formDone]);

  const send = useCallback(
    async (text: string, confirm?: { name: string }) => {
      const trimmed = text.trim();
      if (!trimmed || state === "streaming" || !config) return;
      if (!visitorKey.current) visitorKey.current = getVisitorKey();
      const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMessages);
      setInput("");
      setState("streaming");
      setFormDone(false);
      setPendingConfirm(null);
      setActivity(null);

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.slice(-8),
            visitorKey: visitorKey.current,
            confirm,
          }),
        });

        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const j = (await res.json()) as { limited?: boolean };
          if (j.limited) {
            setState("limited");
            if (config.captureEnabled) setShowForm(true);
          } else {
            setState("error");
          }
          return;
        }
        if (!res.ok || !res.body) {
          setState("error");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let reply = "";
        let sawError = false;
        setMessages([...nextMessages, { role: "assistant", content: "" }]);

        const handleLine = (raw: string) => {
          if (!raw.trim()) return;
          try {
            const evt = JSON.parse(raw) as {
              t?: string;
              contactForm?: boolean;
              limited?: boolean;
              done?: boolean;
              error?: boolean;
              confirm?: { name?: string; summary?: string };
              action?: { label?: string; status?: string };
            };
            if (evt.confirm?.name && evt.confirm.summary)
              setPendingConfirm({ name: evt.confirm.name, summary: evt.confirm.summary });
            if (evt.action)
              setActivity(
                evt.action.status === "running" ? `${evt.action.label ?? "Working"}…` : null,
              );
            if (evt.t) {
              reply += evt.t;
              const display = reply.split("[[CONTACT_FORM]]").join("");
              setMessages([...nextMessages, { role: "assistant", content: display }]);
            }
            if (evt.contactForm && config.captureEnabled) setShowForm(true);
            if (evt.limited) {
              setState("limited");
              if (config.captureEnabled) setShowForm(true);
            }
            if (evt.error) sawError = true;
          } catch {
            // Ignore malformed lines.
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          lines.forEach(handleLine);
        }
        if (buf) handleLine(buf);

        setActivity(null);
        if (!reply && sawError) {
          setMessages(nextMessages);
          setState("error");
        } else {
          setState("idle");
        }
      } catch {
        setActivity(null);
        setMessages((m) => m.filter((msg, i) => !(i === m.length - 1 && msg.role === "assistant" && !msg.content)));
        setState("error");
      }
    },
    [messages, state, config],
  );

  const submitLead = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);
      setFormBusy(true);
      setFormError(null);
      try {
        const res = await fetch("/api/assistant/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: String(data.get("name") ?? ""),
            email: String(data.get("email") ?? ""),
            message: String(data.get("message") ?? ""),
            sourcePage: window.location.pathname,
            visitorKey: visitorKey.current,
          }),
        });
        const j = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (res.ok && j?.ok) {
          setFormDone(true);
          setShowForm(false);
          form.reset();
        } else {
          setFormError(j?.error ?? "That didn't go through — try again.");
        }
      } catch {
        setFormError("That didn't go through — try again.");
      } finally {
        setFormBusy(false);
      }
    },
    [],
  );

  if (!config) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with us"
          className="fixed bottom-16 right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className={cn(
            "fixed z-40 flex flex-col overflow-hidden border border-border bg-card shadow-2xl",
            "inset-x-0 bottom-0 top-16 rounded-t-2xl",
            "sm:inset-auto sm:bottom-16 sm:right-4 sm:top-auto sm:h-[540px] sm:max-h-[calc(100vh-7rem)] sm:w-[380px] sm:rounded-2xl",
          )}
        >
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold">{config.name}</p>
              <p className="text-xs text-muted-foreground">Ask us anything</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-muted/40 px-3.5 py-2.5 text-sm">
                  {config.welcome}
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.prompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm",
                  m.role === "user"
                    ? "ml-auto rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm bg-muted/40",
                )}
              >
                {m.content ||
                  (state === "streaming" && i === messages.length - 1 ? (
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" />
                    </span>
                  ) : null)}
              </div>
            ))}

            {activity && state === "streaming" && (
              <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {activity}
              </div>
            )}

            {pendingConfirm && state !== "streaming" && (
              <div className="rounded-xl border border-border bg-card p-3 text-sm">
                <p className="text-foreground">{pendingConfirm.summary}</p>
                <div className="mt-2.5 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void send("Yes, go ahead.", { name: pendingConfirm.name })}
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingConfirm(null)}
                  >
                    Not now
                  </Button>
                </div>
              </div>
            )}

            {state === "limited" && (
              <div className="max-w-[85%] break-words rounded-2xl rounded-tl-sm bg-muted/40 px-3.5 py-2.5 text-sm">
                {LIMIT_COPY}
              </div>
            )}
            {state === "error" && (
              <div className="max-w-[85%] break-words rounded-2xl rounded-tl-sm bg-muted/40 px-3.5 py-2.5 text-sm">
                {ERROR_COPY}
              </div>
            )}

            {formDone && (
              <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm">
                Got it — your message is in. We'll get back to you by email.
              </div>
            )}

            {config.captureEnabled && showForm && !formDone && (
              <form
                onSubmit={submitLead}
                className="space-y-2 rounded-xl border border-border bg-muted/20 p-3"
              >
                <p className="text-sm font-medium">{config.formIntro || "Send us a message"}</p>
                <Input name="name" placeholder="Your name" required maxLength={120} />
                <Input name="email" type="email" placeholder="Your email" required maxLength={200} />
                <Textarea
                  name="message"
                  placeholder="What would you like to say?"
                  required
                  maxLength={2000}
                  rows={3}
                />
                {formError && <p className="text-xs text-destructive">{formError}</p>}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={formBusy}>
                    {formBusy ? "Sending…" : "Send message"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                  >
                    Not now
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="border-t border-border p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={state === "limited" ? "Chat is resting until tomorrow" : "Ask a question…"}
                disabled={state === "streaming" || state === "limited"}
                maxLength={1500}
                aria-label="Your question"
              />
              <Button
                type="submit"
                size="icon"
                disabled={state === "streaming" || state === "limited" || !input.trim()}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {config.captureEnabled && !showForm && !formDone && (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-2 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
              >
                Send us a message directly
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
