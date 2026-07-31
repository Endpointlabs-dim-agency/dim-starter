"use client";

import { useEffect } from "react";

// EndpointLabs preview bridge — lets the builder workspace enter a
// "click an element to edit it" mode inside the dev-preview iframe.
// Runs ONLY in development (next dev inside a builder session) and only when
// embedded in a trusted parent. Compiled out of production builds; the live
// site never carries any of this. DO NOT REMOVE from app/layout.tsx.

const ALLOWED_PARENTS = [
  "https://app.endpointlabs.io",
  "http://localhost:3000",
];

interface SelectedElement {
  tag: string;
  id?: string;
  classes: string[];
  text?: string;
  selector: string;
  component?: string;
}

function cssPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.tagName !== "BODY" && node.tagName !== "HTML" && parts.length < 6) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`#${node.id}`);
      break;
    }
    const parent: Element | null = node.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === node!.tagName,
      );
      if (siblings.length > 1)
        part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    node = parent;
  }
  return parts.join(" > ");
}

function componentName(el: Element): string | undefined {
  try {
    const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
    if (!key) return undefined;
    let fiber = (el as unknown as Record<string, { return?: unknown; type?: unknown }>)[
      key
    ] as { return?: unknown; type?: unknown } | undefined;
    let depth = 0;
    while (fiber && depth < 25) {
      const t = fiber.type;
      const name =
        typeof t === "function"
          ? (t as { displayName?: string; name?: string }).displayName ||
            (t as { name?: string }).name
          : undefined;
      if (name && /^[A-Z]/.test(name) && name !== "RootLayout") return name;
      fiber = fiber.return as typeof fiber;
      depth += 1;
    }
  } catch {
    // best-effort only
  }
  return undefined;
}

function describe(el: Element): SelectedElement {
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || undefined,
    classes: Array.from(el.classList).slice(0, 6),
    text: text ? text.slice(0, 140) : undefined,
    selector: cssPath(el),
    component: componentName(el),
  };
}

export function PreviewBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (window.parent === window) return;

    let active = false;
    let parentOrigin: string | null = null;
    let box: HTMLDivElement | null = null;
    let label: HTMLDivElement | null = null;
    let current: Element | null = null;

    const post = (data: Record<string, unknown>) => {
      if (parentOrigin) window.parent.postMessage(data, parentOrigin);
    };

    const ensureOverlay = () => {
      if (box) return;
      box = document.createElement("div");
      box.style.cssText =
        "position:fixed;z-index:2147483646;pointer-events:none;border:2px solid #14b8a6;background:rgba(20,184,166,0.08);border-radius:3px;transition:all 60ms ease;display:none";
      label = document.createElement("div");
      label.style.cssText =
        "position:fixed;z-index:2147483647;pointer-events:none;background:#0f766e;color:#fff;font:11px/1.6 ui-monospace,monospace;padding:1px 6px;border-radius:3px;display:none;max-width:60vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      document.body.appendChild(box);
      document.body.appendChild(label);
    };

    const hideOverlay = () => {
      if (box) box.style.display = "none";
      if (label) label.style.display = "none";
      current = null;
    };

    const highlight = (el: Element) => {
      ensureOverlay();
      const r = el.getBoundingClientRect();
      if (!box || !label) return;
      box.style.display = "block";
      box.style.left = `${r.left}px`;
      box.style.top = `${r.top}px`;
      box.style.width = `${r.width}px`;
      box.style.height = `${r.height}px`;
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      label.textContent = `<${el.tagName.toLowerCase()}>${text ? ` ${text.slice(0, 60)}` : ""}`;
      label.style.display = "block";
      label.style.left = `${Math.max(4, r.left)}px`;
      label.style.top = `${r.top > 24 ? r.top - 22 : r.bottom + 4}px`;
    };

    const targetAt = (x: number, y: number): Element | null => {
      const el = document.elementFromPoint(x, y);
      if (!el || el === box || el === label || el === document.body) return null;
      return el;
    };

    const onMove = (e: MouseEvent) => {
      if (!active) return;
      const el = targetAt(e.clientX, e.clientY);
      if (!el) {
        hideOverlay();
        return;
      }
      current = el;
      highlight(el);
    };

    const swallow = (e: Event) => {
      if (!active) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    const onClick = (e: MouseEvent) => {
      if (!active) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const el = targetAt(e.clientX, e.clientY) ?? current;
      if (!el) return;
      post({ type: "epl-target-selected", element: describe(el) });
      setMode(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (!active || e.key !== "Escape") return;
      post({ type: "epl-target-cancelled" });
      setMode(false);
    };

    const setMode = (on: boolean) => {
      if (on === active) return;
      active = on;
      document.documentElement.style.cursor = on ? "crosshair" : "";
      if (!on) hideOverlay();
    };

    const onMessage = (e: MessageEvent) => {
      if (!ALLOWED_PARENTS.includes(e.origin)) return;
      const data = e.data as { type?: string; on?: boolean } | null;
      if (!data || typeof data.type !== "string") return;
      parentOrigin = e.origin;
      if (data.type === "epl-bridge-ping") post({ type: "epl-bridge-ready" });
      else if (data.type === "epl-target-mode") setMode(Boolean(data.on));
    };

    window.addEventListener("message", onMessage);
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("mousedown", swallow, true);
    document.addEventListener("mouseup", swallow, true);
    document.addEventListener("pointerdown", swallow, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("mousedown", swallow, true);
      document.removeEventListener("mouseup", swallow, true);
      document.removeEventListener("pointerdown", swallow, true);
      document.removeEventListener("keydown", onKey, true);
      setMode(false);
      box?.remove();
      label?.remove();
    };
  }, []);

  return null;
}
