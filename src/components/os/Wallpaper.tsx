"use client";
import { useEffect, useRef } from "react";
import { flowCalm, getFlow } from "@/lib/flow";

export function Wallpaper() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const syncVisibility = () => {
      root.toggleAttribute("data-page-hidden", document.visibilityState === "hidden");
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      root.removeAttribute("data-page-hidden");
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (flowCalm() || window.matchMedia("(pointer: coarse)").matches) return;
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0, running = false;
    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) raf = requestAnimationFrame(loop);
      else { running = false; raf = 0; }
    };
    const onMove = (e: PointerEvent) => {
      const d = getFlow().depth / 100;
      tx = (e.clientX / window.innerWidth - 0.5) * -22 * d;
      ty = (e.clientY / window.innerHeight - 0.5) * -16 * d;
      if (!running) { running = true; raf = requestAnimationFrame(loop); }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
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
