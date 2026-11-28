"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { reducedMotion } from "@/lib/utils";
import { anyOverlay, popSuppressed } from "@/lib/overlay";

const OUT_MS = 190;
const IN_MS = 620;
const WATCHDOG = 1100;

export function PageShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const gen = useRef(0);
  const leaving = useRef(false);
  const based = useRef(false);

  const reveal = () => {
    const el = ref.current; if (!el) return;
    el.classList.remove("px-leave", "px-enter");
    el.style.opacity = ""; el.style.transform = ""; el.style.filter = ""; el.style.willChange = "";
    leaving.current = false;
  };

  const enter = () => {
    const el = ref.current; if (!el) return;
    reveal();
    if (reducedMotion()) return;
    void el.offsetWidth;
    el.style.willChange = "transform, opacity, filter";
    el.classList.add("px-enter");
    const mine = ++gen.current;
    window.setTimeout(() => {
      if (gen.current !== mine) return;
      el.classList.remove("px-enter");
      el.style.willChange = "";
    }, IN_MS + 120);
  };

  const commit = (href: string) => {
    if (window.location.pathname === "/") router.push(href);
    else router.replace(href);
  };

  const go = (href: string) => {
    const el = ref.current;
    if (leaving.current) return;
    if (!el || reducedMotion()) { commit(href); return; }
    leaving.current = true;
    const mine = ++gen.current;
    el.style.willChange = "transform, opacity, filter";
    el.classList.remove("px-enter");
    void el.offsetWidth;
    el.classList.add("px-leave");
    window.setTimeout(() => {
      if (gen.current !== mine) return;
      commit(href);
      window.setTimeout(() => { if (gen.current === mine) reveal(); }, WATCHDOG);
    }, OUT_MS);
  };

  useEffect(() => {
    if (based.current) return;
    based.current = true;
    try {
      window.history.scrollRestoration = "auto";
      if (window.location.pathname !== "/") {
        const cur = window.location.href;
        const st = window.history.state;
        window.history.replaceState(st, "", "/");
        window.history.pushState(st, "", cur);
      }
    } catch {}
  }, []);

  useEffect(() => {
    gen.current += 1;
    leaving.current = false;
    enter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const el = ref.current; if (!el) return;

    const onEnd = (e: AnimationEvent) => {
      if (e.animationName === "app-in") { el.classList.remove("px-enter"); el.style.willChange = ""; }
    };
    const onPop = () => {
      if (anyOverlay() || popSuppressed()) return;
      gen.current += 1; leaving.current = false;
      if (window.location.pathname !== "/") { router.replace("/"); return; }
      reveal(); enter();
    };
    const onShow = () => { gen.current += 1; reveal(); };
    const onVis = () => {
      if (document.visibilityState === "visible" && !leaving.current && el.classList.contains("px-leave")) reveal();
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (anyOverlay()) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const raw = a.getAttribute("href");
      if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try { url = new URL(a.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) {
        if (url.hash) return;
        e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); return;
      }
      e.preventDefault();
      go(url.pathname + url.search + url.hash);
    };
    const onCustom = (e: Event) => {
      const href = (e as CustomEvent<{ href?: string }>).detail?.href;
      if (typeof href === "string" && href.startsWith("/")) go(href);
    };

    el.addEventListener("animationend", onEnd);
    window.addEventListener("popstate", onPop);
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("click", onClick, true);
    window.addEventListener("px:navigate", onCustom);
    return () => {
      el.removeEventListener("animationend", onEnd);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("px:navigate", onCustom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return <div ref={ref} className="px-shell">{children}</div>;
}
