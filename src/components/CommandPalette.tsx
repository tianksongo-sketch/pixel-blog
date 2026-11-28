"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { overlayEnter, overlayLeave, suppressNextPop } from "@/lib/overlay";
import { getMotion, haptic, loadMotion, setMotion, tick } from "@/lib/motion";
import { Icon } from "./ui";
import { useApp } from "./Providers";

type Item = { id: string; title: string; excerpt: string; labels: string[]; readMin: number };
type Row = { key: string; group: string; icon: string; title: string; sub: string; run: () => void };

export function CommandPalette() {
  const { mode, setMode, snack } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lebay, setLebay] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  const close = useCallback(() => setOpen(false), []);
  const go = useCallback((href: string) => { close(); window.dispatchEvent(new CustomEvent("px:navigate", { detail: { href } })); }, [close]);

  useEffect(() => {
    loadMotion();
    setLebay(getMotion().lebay);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); }
    };
    const buka = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("px:open-palette", buka);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("px:open-palette", buka); };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ(""); setCursor(0); setLebay(getMotion().lebay);
    overlayEnter();
    try { window.history.pushState({ ...(window.history.state || {}), pxOverlay: 1 }, ""); pushed.current = true; } catch { /* abaikan */ }
    const onPop = () => { if (pushed.current) { pushed.current = false; setOpen(false); } };
    window.addEventListener("popstate", onPop);
    const t = setTimeout(() => inputRef.current?.focus(), 70);
    setLoading(true);
    void fetch("/api/search", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => setItems(Array.isArray(j.items) ? j.items : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    return () => {
      window.removeEventListener("popstate", onPop);
      clearTimeout(t);
      overlayLeave();
      if (pushed.current) { pushed.current = false; suppressNextPop(); try { window.history.back(); } catch { /* abaikan */ } }
    };
  }, [open]);

  const rows = useMemo<Row[]>(() => {
    const n = q.trim().toLowerCase();
    const actions: Row[] = [
      { key: "a-home", group: "Aksi", icon: "home", title: "Beranda", sub: "Daftar tulisan", run: () => go("/") },
      { key: "a-about", group: "Aksi", icon: "info", title: "Tentang", sub: "Tentang F4KUYY", run: () => go("/about") },
      { key: "a-admin", group: "Aksi", icon: "edit_note", title: "Panel admin", sub: "Tulis & kelola", run: () => go("/admin") },
      { key: "a-set", group: "Aksi", icon: "tune", title: "Pengaturan tampilan", sub: "Tema · Lebay · Haptic", run: () => { close(); window.dispatchEvent(new Event("px:open-settings")); } },
      { key: "a-mode", group: "Aksi", icon: mode === "dark" ? "light_mode" : "dark_mode", title: mode === "dark" ? "Mode terang" : "Mode gelap", sub: "Ganti tema", run: () => { setMode(mode === "dark" ? "light" : "dark"); haptic(8); close(); } },
      { key: "a-lebay", group: "Aksi", icon: "auto_awesome", title: lebay ? "Matikan Lebay mode" : "Nyalakan Lebay mode", sub: "Animasi 2×", run: () => { const v = !getMotion().lebay; setMotion({ lebay: v }); setLebay(v); haptic(12); snack(v ? "Lebay mode aktif" : "Lebay mode mati"); close(); } },
      { key: "a-rss", group: "Aksi", icon: "rss_feed", title: "Langganan RSS", sub: "/feed.xml", run: () => { window.open("/feed.xml", "_blank", "noopener"); close(); } },
      { key: "a-copy", group: "Aksi", icon: "link", title: "Salin tautan beranda", sub: typeof window !== "undefined" ? window.location.origin : "", run: () => { void navigator.clipboard?.writeText(window.location.origin).then(() => snack("Tautan disalin")).catch(() => snack("Gagal menyalin")); close(); } }
    ];
    const posts: Row[] = items
      .filter((it) => !n || (it.title + " " + it.excerpt + " " + it.labels.join(" ")).toLowerCase().includes(n))
      .slice(0, 8)
      .map((it) => ({ key: `p-${it.id}`, group: "Tulisan", icon: "article", title: it.title, sub: `${it.readMin} mnt baca${it.labels.length ? " · " + it.labels.join(", ") : ""}`, run: () => go(`/post/${it.id}`) }));
    const acts = actions.filter((a) => !n || (a.title + " " + a.sub).toLowerCase().includes(n));
    return [...posts, ...acts];
  }, [q, items, mode, lebay, close, go, setMode, snack]);

  useEffect(() => { setCursor(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => (rows.length ? (c + 1) % rows.length : 0)); tick(880); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => (rows.length ? (c - 1 + rows.length) % rows.length : 0)); tick(880); }
      else if (e.key === "Enter") { e.preventDefault(); haptic(8); rows[cursor]?.run(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, rows, cursor, close]);

  useEffect(() => { listRef.current?.querySelector<HTMLElement>(".al-pal-row.on")?.scrollIntoView({ block: "nearest" }); }, [cursor]);

  if (typeof document === "undefined") return null;
  let lastGroup = "";

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="al-pal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} onClick={close} />
          <div className="al-pal-wrap">
            <motion.div className="al-pal" role="dialog" aria-modal="true" aria-label="Palet perintah"
              initial={{ opacity: 0, y: -20, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: .97 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}>
              <div className="al-pal-input">
                <Icon name="search" size={22} />
                <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari tulisan atau perintah…" aria-label="Cari" />
                <kbd className="al-pal-key">ESC</kbd>
              </div>
              <div className="al-pal-list" ref={listRef}>
                {loading && <div className="al-pal-empty">Memuat…</div>}
                {!loading && rows.length === 0 && <div className="al-pal-empty">Tidak ada yang cocok dengan "{q}".</div>}
                {rows.map((r, i) => {
                  const head = r.group !== lastGroup ? r.group : "";
                  lastGroup = r.group;
                  return (
                    <div key={r.key}>
                      {head && <div className="al-pal-group">{head}</div>}
                      <button type="button" className={`al-pal-row${i === cursor ? " on" : ""}`}
                        onMouseEnter={() => setCursor(i)} onClick={() => { haptic(6); r.run(); }}>
                        <span className="al-pal-ic"><Icon name={r.icon} size={19} /></span>
                        <span className="al-pal-txt">
                          <span className="al-pal-title">{r.title}</span>
                          <span className="al-pal-sub">{r.sub}</span>
                        </span>
                        {i === cursor && <Icon name="keyboard_return" size={18} />}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="al-pal-foot"><span>↑ ↓ pilih</span><span>Enter buka</span><span>Esc tutup</span><span>? pintasan</span></div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
