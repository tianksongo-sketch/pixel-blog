"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui";
import { calmNow, getMotion } from "@/lib/motion";

export type HeroStatsData = { posts: number; likes: number; comments: number; views: number; labels: number };

function useCountUp(target: number, run: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (calmNow() || target === 0) { setN(target); return; }
    const dur = 900 * (getMotion().lebay ? 2 : 1);
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

function Tile({ value, label, icon, run }: { value: number; label: string; icon: string; run: boolean }) {
  const n = useCountUp(value, run);
  return (
    <div className="gs-tile" data-reveal>
      <div className="gs-num">{n.toLocaleString("id-ID")}</div>
      <div className="gs-lab"><Icon name={icon} size={13} />{label}</div>
    </div>
  );
}

export function HeroStats({ stats }: { stats: HeroStatsData }) {
  const [run, setRun] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(true); io.disconnect(); } }, { threshold: .2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Jangan tampilkan blok angka kalau memang belum ada data sama sekali. */
  const empty = stats.posts === 0 && stats.likes === 0 && stats.comments === 0 && stats.views === 0;

  return (
    <div ref={ref}>
      <div className="gs-strip">
        <span>Arsip</span><i /><span>{stats.labels} label</span>
      </div>
      <div className="gs" style={empty ? { opacity: .45 } : undefined}>
        <Tile value={stats.posts} label="Tulisan" icon="article" run={run} />
        <Tile value={stats.views} label="Pembaca" icon="visibility" run={run} />
        <Tile value={stats.likes} label="Suka" icon="favorite" run={run} />
        <Tile value={stats.comments} label="Komentar" icon="chat_bubble" run={run} />
      </div>
    </div>
  );
}
