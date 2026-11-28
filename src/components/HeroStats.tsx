"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Icon } from "./ui";
import { calmNow, getMotion } from "@/lib/motion";

export type HeroStatsData = { posts: number; likes: number; comments: number; views: number; labels: number };

function useCountUp(target: number, run: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (calmNow() || target === 0) { setN(target); return; }
    const dur = 800 * (getMotion().lebay ? 2 : 1);
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

function Tile({ value, label, icon, run, i }: { value: number; label: string; icon: string; run: boolean; i: number }) {
  const n = useCountUp(value, run);
  return (
    <motion.div
      className="gs-tile"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30, delay: i * 0.05 }}
    >
      <div className="gs-num">{n.toLocaleString("id-ID")}</div>
      <div className="gs-lab"><Icon name={icon} size={13} />{label}</div>
    </motion.div>
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

  const empty = stats.posts === 0 && stats.likes === 0 && stats.comments === 0 && stats.views === 0;

  return (
    <div ref={ref}>
      <div className="gs-strip">
        <span>Arsip</span><i /><span>{stats.labels} label</span>
      </div>
      <div className="gs" style={empty ? { opacity: .45 } : undefined}>
        <Tile i={0} value={stats.posts} label="Tulisan" icon="article" run={run} />
        <Tile i={1} value={stats.views} label="Pembaca" icon="visibility" run={run} />
        <Tile i={2} value={stats.likes} label="Suka" icon="favorite" run={run} />
        <Tile i={3} value={stats.comments} label="Komentar" icon="chat_bubble" run={run} />
      </div>
    </div>
  );
}
