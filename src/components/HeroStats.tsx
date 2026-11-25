"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui";
import { calmNow, getMotion } from "@/lib/motion";

type Stats = { posts: number; likes: number; comments: number; views: number; labels: number };

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
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
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

export function HeroStats() {
  const [s, setS] = useState<Stats | null>(null);
  const [run, setRun] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch("/api/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j) setS(j as Stats); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(true); io.disconnect(); } }, { threshold: .2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const d = s ?? { posts: 0, likes: 0, comments: 0, views: 0, labels: 0 };

  return (
    <div ref={ref}>
      <div className="gs-strip">
        <span>Arsip</span><i /><span>{d.labels} label</span>
      </div>
      <div className="gs">
        <Tile value={d.posts} label="Tulisan" icon="article" run={run} />
        <Tile value={d.views} label="Pembaca" icon="visibility" run={run} />
        <Tile value={d.likes} label="Suka" icon="favorite" run={run} />
        <Tile value={d.comments} label="Komentar" icon="chat_bubble" run={run} />
      </div>
    </div>
  );
}
