"use client";
import { useEffect, useRef } from "react";
import { reducedMotion } from "@/lib/utils";

export function GlassLayer() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    try {
      if (localStorage.getItem("px:glass") === "on") document.documentElement.dataset.glass = "on";
    } catch { /* preferensi visual opsional */ }
    if (!el || reducedMotion()) return;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const blobs = Array.from(el.querySelectorAll<HTMLElement>(".gl-blob"));

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const loop = () => {
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;
      const depth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gl-depth")) || 0;
      blobs.forEach((b, i) => {
        const k = (i + 1) * 9 * depth;
        b.style.marginLeft = `${(-cx * k).toFixed(2)}px`;
        b.style.marginTop = `${(-cy * k).toFixed(2)}px`;
      });
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(loop);
      else raf = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const lens = (e: PointerEvent) => {
      const t = (e.target as HTMLElement | null)?.closest?.(".gl-lens") as HTMLElement | null;
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--gx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      t.style.setProperty("--gy", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
    };
    window.addEventListener("pointermove", lens, { passive: true });
    return () => window.removeEventListener("pointermove", lens);
  }, []);

  return (
    <div ref={ref} className="gl-canvas" aria-hidden="true">
      <div className="gl-blob gl-b1" />
      <div className="gl-blob gl-b2" />
      <div className="gl-blob gl-b3" />
      <div className="gl-blob gl-b4" />
      <div className="gl-caustic" />
      <div className="gl-hue" />
      <div className="gl-grain" />
      <div className="gl-vignette" />
    </div>
  );
}
