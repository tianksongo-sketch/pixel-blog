"use client";
import { reducedMotion } from "./utils";

/** Navigasi SPA dengan View Transitions (shared element foto kartu → detail). */
export function navVT(router: { push: (h: string) => void }, href: string): void {
  if (typeof document === "undefined") return;
  const path = href.split("#")[0];
  const doc = document as Document & { startViewTransition?: (cb: () => Promise<void> | void) => unknown };
  if (reducedMotion() || !doc.startViewTransition) { router.push(href); return; }
  doc.startViewTransition(async () => {
    router.push(href);
    await new Promise<void>((res) => {
      const t0 = performance.now();
      const tick = () => {
        if (window.location.pathname === path || performance.now() - t0 > 1200) res();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });
}
