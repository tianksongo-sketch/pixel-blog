"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { PostWithStats } from "@/lib/db";
import { attachRipple, Icon, LabelChip } from "./ui";
import { PostCard } from "./PostCard";

export function FeedView({ posts, initialLabel }: { posts: PostWithStats[]; initialLabel?: string }) {
  const [q, setQ] = useState("");
  const [label, setLabel] = useState<string | null>(initialLabel ?? null);
  const [sort, setSort] = useState<"new" | "top">("new");
  const [remoteSearch, setRemoteSearch] = useState<{ query: string; ids: string[] } | null>(null);
  const [searchingBody, setSearchingBody] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) { setSearchingBody(false); return; }
    setSearchingBody(true);
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        const data = await response.json();
        if (active && response.ok && Array.isArray(data.items)) {
          setRemoteSearch({ query, ids: data.items.map((item: { id?: unknown }) => String(item.id ?? "")) });
        }
      } catch { /* pencarian judul dan ringkasan tetap tersedia */ }
      finally { if (active) setSearchingBody(false); }
    }, 260);
    return () => { active = false; clearTimeout(timer); };
  }, [q]);

  useEffect(() => {
    const focus = () => {
      searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => searchRef.current?.focus(), 320);
    };
    window.addEventListener("px:focus-search", focus);
    return () => window.removeEventListener("px:focus-search", focus);
  }, []);

  const labels = useMemo(() => {
    const count = new Map<string, number>();
    posts.forEach((p) => p.labels.forEach((l) => count.set(l, (count.get(l) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([l]) => l);
  }, [posts]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = posts.filter((p) => {
      if (label && !p.labels.some((l) => l.toLowerCase() === label.toLowerCase())) return false;
      if (!needle) return true;
      if (needle.length >= 2 && remoteSearch?.query === needle) return remoteSearch.ids.includes(p.id);
      return (p.title + " " + p.excerpt + " " + p.labels.join(" ")).toLowerCase().includes(needle);
    });
    return [...out].sort((a, b) => sort === "top" ? b.likes - a.likes || b.createdAt - a.createdAt : b.createdAt - a.createdAt);
  }, [posts, q, label, sort, remoteSearch]);

  const filtered = !!q.trim() || !!label;

  return (
    <>
      <div className="feed-tools">
        <div className="search-pill">
          <Icon name="search" size={22} />
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari postingan…" aria-label="Cari postingan" />
          {q && (
            <button className="btn b-icon" onPointerDown={attachRipple} onClick={() => setQ("")} aria-label="Bersihkan pencarian">
              <Icon name="close" size={20} />
            </button>
          )}
        </div>
        <div className="sort-toggle" role="group" aria-label="Urutkan">
          <button className={sort === "new" ? "on" : ""} onPointerDown={attachRipple} onClick={() => setSort("new")} aria-pressed={sort === "new"}>
            <Icon name={sort === "new" ? "check" : "schedule"} size={18} weight={600} />Terbaru
          </button>
          <button className={sort === "top" ? "on" : ""} onPointerDown={attachRipple} onClick={() => setSort("top")} aria-pressed={sort === "top"}>
            <Icon name={sort === "top" ? "check" : "favorite"} size={18} weight={600} />Terpopuler
          </button>
        </div>
      </div>

      {labels.length > 0 && (
        <div className="filter-row">
          <LabelChip label="Semua" active={!label} onClick={() => setLabel(null)} />
          {labels.map((l) => (
            <LabelChip key={l} label={l} active={label?.toLowerCase() === l.toLowerCase()}
              onClick={() => setLabel(label?.toLowerCase() === l.toLowerCase() ? null : l)} />
          ))}
        </div>
      )}

      <div className="section-head">
        <h2>{filtered ? "Hasil" : sort === "top" ? "Paling disukai" : "Tulisan terbaru"}</h2>
        <span className="search-hint" aria-live="polite">{searchingBody ? "Mencari seluruh isi…" : ""}</span>
        <span className="count">{shown.length}</span>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <Icon name={posts.length ? "search_off" : "edit_note"} size={56} />
          <p style={{ marginTop: 14 }}>
            {posts.length ? "Tidak ada yang cocok. Coba kata lain atau hapus filter." : "Belum ada postingan. Buka panel admin untuk mulai menulis."}
          </p>
          {posts.length > 0 && filtered && (
            <button className="btn b-tonal" style={{ marginTop: 18 }} onPointerDown={attachRipple}
              onClick={() => { setQ(""); setLabel(null); }}>
              <Icon name="filter_alt_off" size={18} />Hapus filter
            </button>
          )}
        </div>
      ) : (
        <motion.div className="feed-grid" layout>
          {shown.map((p, i) => (
            <motion.div key={p.id} className={`cell${i === 0 ? " cell-hero" : ""}`} layout
              initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
              <PostCard post={p} index={i} onLabel={(l) => setLabel(l)} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}
