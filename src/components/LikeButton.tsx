"use client";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { GOOGLE_COLORS, reducedMotion } from "@/lib/utils";
import { attachRipple, Icon, RollingNumber } from "./ui";
import { useApp } from "./Providers";

export function LikeButton({ postId, count, liked }: { postId: string; count: number; liked: boolean }) {
  const { requireConsent, snack, hasVid } = useApp();
  const [on, setOn] = useState(liked);
  const [n, setN] = useState(count);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);

  const burst = () => {
    const el = wrapRef.current;
    if (!el || reducedMotion()) return;
    for (let i = 0; i < 12; i++) {
      const dot = document.createElement("span");
      dot.className = "burst-dot";
      const size = 4 + Math.random() * 4;
      dot.style.width = dot.style.height = `${size}px`;
      dot.style.background = GOOGLE_COLORS[i % 4];
      el.appendChild(dot);
      const a = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      const d = 22 + Math.random() * 20;
      const dx = Math.cos(a) * d;
      const dy = Math.sin(a) * d;
      dot.animate(
        [
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0 }
        ],
        { duration: 480 + Math.random() * 220, easing: "cubic-bezier(0.05,0.7,0.1,1)" }
      ).onfinish = () => dot.remove();
    }
  };

  const revert = (next: boolean) => {
    setOn(!next);
    setN((v) => Math.max(0, v + (next ? -1 : 1)));
  };

  const doToggle = async () => {
    if (busy.current) return;
    busy.current = true;
    const next = !on;
    setOn(next);
    setN((v) => Math.max(0, v + (next ? 1 : -1)));
    if (next) {
      burst();
      try { navigator.vibrate?.(10); } catch { /* abaikan */ }
    }
    try {
      const r = await fetch("/api/like", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: postId })
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setOn(!!j.liked);
        setN(Number(j.count) || 0);
      } else {
        revert(next);
        if (j.needConsent) requireConsent(() => { void doToggle(); });
        else snack(j.error || "Gagal menyukai, coba lagi");
      }
    } catch {
      revert(next);
      snack("Gagal terhubung, coba lagi");
    } finally {
      busy.current = false;
    }
  };

  const onClick = () => {
    if (!hasVid) { requireConsent(() => { void doToggle(); }); return; }
    void doToggle();
  };

  return (
    <button
      className="btn b-text act" onPointerDown={attachRipple} onClick={onClick}
      aria-pressed={on} aria-label={on ? "Batalkan suka" : "Suka"}
    >
      <span className="heart-wrap" ref={wrapRef}>
        <motion.span
          className={`heart${on ? " on" : ""}`}
          animate={on ? { scale: [1, 1.35, 0.85, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 0.45, times: [0, 0.3, 0.55, 0.75, 1], ease: "easeOut" }}
        >
          <Icon name="favorite" fill={on} size={21} />
        </motion.span>
      </span>
      <RollingNumber value={n} />
    </button>
  );
}
