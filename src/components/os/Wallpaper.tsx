"use client";
import { useEffect, useRef } from "react";
import { perf, perfCalm, addFrameTask, onVisible } from "@/lib/perf";

export function Wallpaper() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const p = perf();
    if (p.coarse || perfCalm()) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, active = true;

    const onMove = (e: PointerEvent) => {
      const depth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--f-depth")) || 0;
      tx = (e.clientX / window.innerWidth - 0.5) * -20 * depth;
      ty = (e.clientY / window.innerHeight - 0.5) * -14 * depth;
    };

    const stop = addFrameTask(() => {
      if (!active) return;
      if (Math.abs(tx - cx) < 0.04 && Math.abs(ty - cy) < 0.04) return;
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      el.style.setProperty("--wx", `${cx.toFixed(2)}px`);
      el.style.setProperty("--wy", `${cy.toFixed(2)}px`);
    });

    const offVis = onVisible(el, (v) => { active = v; }, "0px");
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      stop(); offVis();
      el.style.removeProperty("--wx");
      el.style.removeProperty("--wy");
    };
  }, []);

  return (
    <div className="wall" ref={ref} aria-hidden="true">
      <div className="wall-base" />
      <i className="o1" /><i className="o2" /><i className="o3" /><i className="o4" /><i className="o5" />
      <span className="petal p1" /><span className="petal p2" />
      <div className="wall-grain" />
      <div className="wall-dim" />
    </div>
  );
}
