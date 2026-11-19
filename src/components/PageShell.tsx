"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { reducedMotion } from "@/lib/utils";

/* Transisi halaman: jendela lama mengecil & memudar, jendela baru masuk
   membesar dengan overshoot. Hanya transform + opacity supaya tetap di compositor. */
const EXIT_TRANSFORM: Keyframe[] = [
  { transform: "scale(1) translateY(0)" },
  { transform: "scale(0.93) translateY(-14px)" }
];
const ENTER_TRANSFORM: Keyframe[] = [
  { transform: "scale(1.09) translateY(30px)" },
  { transform: "scale(1) translateY(0)" }
];
const OVERSHOOT = "cubic-bezier(0.18, 1.28, 0.32, 1)";
const DECEL = "cubic-bezier(0.05, 0.7, 0.1, 1)";
const ACCEL = "cubic-bezier(0.3, 0, 0.8, 0.15)";

export function PageShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const safety = useRef<number | null>(null);
  const running = useRef<Animation[]>([]);

  const stopAll = () => {
    running.current.forEach((a) => { try { a.cancel(); } catch { /* abaikan */ } });
    running.current = [];
    if (safety.current) { clearTimeout(safety.current); safety.current = null; }
    const el = ref.current;
    if (el) { el.style.willChange = ""; el.style.opacity = ""; el.style.transform = ""; }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    stopAll();
    busy.current = false;
    if (reducedMotion()) return;

    el.style.willChange = "transform, opacity";
    const a1 = el.animate(ENTER_TRANSFORM, { duration: 720, easing: OVERSHOOT, fill: "none" });
    const a2 = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 340, easing: DECEL, fill: "none" });
    running.current = [a1, a2];
    const done = () => { el.style.willChange = ""; running.current = []; };
    a1.finished.then(done).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const go = (href: string) => {
      const el = ref.current;
      if (busy.current) return;
      if (!el || reducedMotion()) { router.push(href); return; }
      busy.current = true;
      el.style.willChange = "transform, opacity";
      const a1 = el.animate(EXIT_TRANSFORM, { duration: 210, easing: ACCEL, fill: "forwards" });
      const a2 = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 190, easing: ACCEL, fill: "forwards" });
      running.current = [a1, a2];
      a1.finished.then(() => {
        router.push(href);
        /* Kalau navigasi lambat, kembalikan konten agar tidak blank. */
        safety.current = window.setTimeout(() => {
          a1.cancel(); a2.cancel();
          el.style.willChange = "";
          busy.current = false;
        }, 900);
      }).catch(() => { busy.current = false; });
    };

    const onCustom = (e: Event) => {
      const href = (e as CustomEvent<{ href?: string }>).detail?.href;
      if (typeof href === "string" && href.startsWith("/")) go(href);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const raw = a.getAttribute("href");
      if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try { url = new URL(a.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) {
        if (url.hash) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      e.preventDefault();
      go(url.pathname + url.search + url.hash);
    };

    window.addEventListener("px:navigate", onCustom);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("px:navigate", onCustom);
      document.removeEventListener("click", onClick, true);
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <div ref={ref} style={{ backfaceVisibility: "hidden", transformOrigin: "50% 40%" }}>
      {children}
    </div>
  );
}
