"use client";
import { useEffect, useRef } from "react";
import { flowCalm } from "@/lib/flow";

export function Wallpaper() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || flowCalm() || window.matchMedia("(hover: none)").matches) return;
    let raf = 0, tx = 0, ty = 0;
    const onMove = (e: PointerEvent) => {
      const depth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--f-depth")) || 0;
      tx = (e.clientX / window.innerWidth - 0.5) * -26 * depth;
      ty = (e.clientY / window.innerHeight - 0.5) * -18 * depth;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--wx", `${tx.toFixed(1)}px`);
        el.style.setProperty("--wy", `${ty.toFixed(1)}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="wall" ref={ref} aria-hidden="true">
      <div className="wall-base" />
      <i className="o1" /><i className="o2" /><i className="o3" /><i className="o4" /><i className="o5" />
      <div className="wall-grain" />
      <div className="wall-dim" />
    </div>
  );
}
