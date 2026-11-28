"use client";
import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "@/lib/utils";
import { Btn, Dialog, Icon } from "./ui";

const SHORTCUTS: Array<[string, string]> = [
  ["Ctrl / ⌘ + K", "Buka palet perintah"],
  ["/", "Fokus ke pencarian"],
  ["G lalu H", "Ke beranda"],
  ["G lalu A", "Ke About blog"],
  ["G lalu T", "Buka pengaturan"],
  ["?", "Tampilkan pintasan ini"],
  ["Esc", "Tutup panel aktif"]
];

const AUTO_REVEAL = ".feed-grid > *, .admin-list > *, .stat-strip > *, .alp-meters > *, .gs > *, .gs-tile, .alp-top > *, .share-row-pills > *";

export function Alive() {
  const [help, setHelp] = useState(false);
  const gKey = useRef(0);

  useEffect(() => {
    const all = () => Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const showAll = () => all().forEach((el) => el.classList.add("al-in"));

    if (reducedMotion()) { showAll(); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target as HTMLElement;
        const sibs = Array.from(el.parentElement?.children ?? []);
        el.style.setProperty("--al-delay", `${Math.min(Math.max(sibs.indexOf(el), 0), 8) * 55}ms`);
        el.classList.add("al-in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });

    const scan = () => {
      all().forEach((el) => { if (!el.classList.contains("al-in")) io.observe(el); });
      document.querySelectorAll<HTMLElement>(AUTO_REVEAL).forEach((el) => {
        if (el.dataset.reveal) return;
        el.dataset.reveal = "1";
        io.observe(el);
      });
      document.querySelectorAll<HTMLElement>(".card").forEach((card) => {
        if (card.querySelector(":scope > .al-spot")) return;
        const s = document.createElement("span");
        s.className = "al-spot";
        s.setAttribute("aria-hidden", "true");
        card.appendChild(s);
      });
    };

    scan();
    let t = 0;
    const mo = new MutationObserver(() => { window.clearTimeout(t); t = window.setTimeout(scan, 110); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); window.clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (reducedMotion() || window.matchMedia("(hover: none)").matches) return;
    let raf = 0;
    let target: HTMLElement | null = null;
    let px = 0, py = 0;
    const apply = () => {
      raf = 0;
      const card = target;
      if (!card) return;
      const r = card.getBoundingClientRect();
      const nx = (px - r.left) / r.width;
      const ny = (py - r.top) / r.height;
      card.style.setProperty("--mx", `${(nx * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(ny * 100).toFixed(1)}%`);
      card.classList.add("al-tilt");
      card.style.setProperty("--ry", `${((nx - 0.5) * 3.2).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${((0.5 - ny) * 2.4).toFixed(2)}deg`);
    };
    const onMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement | null)?.closest?.(".card") as HTMLElement | null;
      if (card !== target) {
        if (target) { target.classList.remove("al-tilt"); target.style.removeProperty("--rx"); target.style.removeProperty("--ry"); }
        target = card;
      }
      if (!card) return;
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      if (target) { target.classList.remove("al-tilt"); target.style.removeProperty("--rx"); target.style.removeProperty("--ry"); target = null; }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const typing = (el: EventTarget | null) => {
      const n = el as HTMLElement | null;
      if (!n) return false;
      const tag = n.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || n.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") { e.preventDefault(); setHelp(true); return; }
      if (e.key === "/") { e.preventDefault(); window.dispatchEvent(new Event("px:focus-search")); return; }
      const k = e.key.toLowerCase();
      if (k === "g") { gKey.current = Date.now(); return; }
      if (Date.now() - gKey.current < 900) {
        if (k === "h") { e.preventDefault(); window.dispatchEvent(new CustomEvent("px:navigate", { detail: { href: "/" } })); gKey.current = 0; }
        else if (k === "a") { e.preventDefault(); window.dispatchEvent(new CustomEvent("px:navigate", { detail: { href: "/about" } })); gKey.current = 0; }
        else if (k === "t") { e.preventDefault(); window.dispatchEvent(new Event("px:open-settings")); gKey.current = 0; }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={help} onClose={() => setHelp(false)} icon="keyboard" title="Pintasan keyboard"
      actions={<Btn variant="filled" onClick={() => setHelp(false)}>Mengerti</Btn>}>
      <div className="al-keys">
        {SHORTCUTS.map(([k, d]) => (
          <div className="al-keyrow" key={k}>
            <kbd className="al-pal-key">{k}</kbd>
            <span>{d}</span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--md-on-surface-variant)", display: "flex", gap: 8, alignItems: "center" }}>
        <Icon name="waves" size={16} />Laut di belakang bergerak pelan; kartu menyorot mengikuti kursor.
      </p>
    </Dialog>
  );
}
