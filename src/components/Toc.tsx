"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { attachRipple, Icon } from "./ui";

type Item = { id: string; text: string; level: number };

function slug(s: string, i: number): string {
  const base = s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 48);
  return `h-${base || "bagian"}-${i}`;
}

export function Toc({ postId }: { postId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const body = document.querySelector(".article-body");
    if (!body) { setItems([]); return; }
    const heads = Array.from(body.querySelectorAll("h2, h3")) as HTMLElement[];
    const list: Item[] = heads.map((h, i) => {
      if (!h.id) h.id = slug(h.textContent || "", i);
      return { id: h.id, text: (h.textContent || "").trim(), level: h.tagName === "H3" ? 3 : 2 };
    }).filter((x) => x.text);
    setItems(list);
    setOpen(list.length > 0 && list.length <= 6 && window.innerWidth >= 720);
    if (!list.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-110px 0px -68% 0px", threshold: [0, 1] }
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [postId]);

  if (items.length < 2) return null;

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
    setActive(id);
  };

  return (
    <nav className="card" aria-label="Daftar isi" style={{ marginTop: 24, padding: 0, overflow: "hidden" }}>
      <button
        type="button" onPointerDown={attachRipple} onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          position: "relative", overflow: "hidden", width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px", border: 0, background: "none", cursor: "pointer", color: "inherit", textAlign: "left"
        }}
      >
        <Icon name="toc" size={22} />
        <span style={{ flex: 1, fontSize: 16, fontWeight: 700, letterSpacing: "-.2px" }}>Daftar isi</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--md-on-tertiary-container)", background: "var(--md-tertiary-container)", borderRadius: 999, padding: "2px 10px" }}>{items.length}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 420, damping: 30 }} style={{ display: "inline-flex" }}>
          <Icon name="expand_more" size={22} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.05, 0.7, 0.1, 1] }}
            style={{ padding: "0 12px 14px" }}
          >
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              {items.map((it) => {
                const on = active === it.id;
                return (
                  <li key={it.id}>
                    <button
                      type="button" onPointerDown={attachRipple} onClick={() => jump(it.id)}
                      style={{
                        position: "relative", overflow: "hidden", width: "100%", textAlign: "left",
                        border: 0, cursor: "pointer", borderRadius: 12,
                        padding: "10px 14px", paddingLeft: it.level === 3 ? 32 : 14,
                        background: on ? "var(--md-secondary-container)" : "transparent",
                        color: on ? "var(--md-on-secondary-container)" : "var(--md-on-surface-variant)",
                        fontSize: 14, fontWeight: on ? 700 : 500, lineHeight: 1.4,
                        display: "flex", alignItems: "center", gap: 10,
                        transition: "background-color .25s, color .25s"
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 999, flex: "none", background: on ? "currentColor" : "var(--md-outline-variant)" }} />
                      <span style={{ minWidth: 0 }}>{it.text}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
