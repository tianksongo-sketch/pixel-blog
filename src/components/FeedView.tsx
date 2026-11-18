"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PostWithStats } from "@/lib/db";
import { attachRipple, Icon, LabelChip } from "./ui";
import { PostCard } from "./PostCard";

export function FeedView({ posts, initialLabel }: { posts: PostWithStats[]; initialLabel?: string }) {
  const [q, setQ] = useState("");
  const [label, setLabel] = useState<string | null>(initialLabel ?? null);
  const [sort, setSort] = useState<"new" | "top">("new");

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
      return (p.title + " " + p.excerpt + " " + p.labels.join(" ")).toLowerCase().includes(needle);
    });
    return out.sort((a, b) => sort === "top" ? b.likes - a.likes || b.createdAt - a.createdAt : b.createdAt - a.createdAt);
  }, [posts, q, label, sort]);

  return (
    <>
      <div className="feed-tools">
        <div className="search-pill">
          <Icon name="search" size={20} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari postingan…" aria-label="Cari postingan" />
          {q && (
            <button className="btn b-icon" onPointerDown={attachRipple} onClick={() => setQ("")} aria-label="Bersihkan pencarian">
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
        <div className="sort-toggle">
          <button className={sort === "new" ? "on" : ""} onPointerDown={attachRipple} onClick={() => setSort("new")}>
            <Icon name="schedule" size={16} />Terbaru
          </button>
          <button className={sort === "top" ? "on" : ""} onPointerDown={attachRipple} onClick={() => setSort("top")}>
            <Icon name="favorite" size={16} />Terpopuler
          </button>
        </div>
      </div>

      {labels.length > 0 && (
        <div className="filter-row">
          <LabelChip label="Semua" active={!label} onClick={() => setLabel(null)} />
          {labels.map((l) => (
            <LabelChip key={l} label={l} active={label?.toLowerCase() === l.toLowerCase()} onClick={() => setLabel(label?.toLowerCase() === l.toLowerCase() ? null : l)} />
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="empty">
          <Icon name={posts.length ? "search_off" : "photo_library"} size={56} />
          <p style={{ marginTop: 12 }}>
            {posts.length ? "Tidak ada yang cocok. Coba kata lain atau hapus filter." : "Belum ada postingan. Buka panel admin untuk mulai menulis."}
          </p>
        </div>
      ) : (
        <motion.div className="feed-grid" layout>
          <AnimatePresence mode="popLayout">
            {shown.map((p, i) => (
              <motion.div key={p.id} layout exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}>
                <PostCard post={p} index={i} onLabel={(l) => setLabel(l)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
