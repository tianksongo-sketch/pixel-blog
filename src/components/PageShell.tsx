"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { reducedMotion } from "@/lib/utils";
import { anyOverlay, popSuppressed } from "@/lib/overlay";

const OUT_MS = 190;
const IN_MS = 720;
const WATCHDOG_MS = 1100;

const SHELL_CSS = `
.px-shell{transform-origin:50% 42%;backface-visibility:hidden;}
@keyframes px-shell-in{
  0%{opacity:0;transform:scale(1.085) translate3d(0,30px,0);}
  58%{opacity:1;}
  100%{opacity:1;transform:scale(1) translate3d(0,0,0);}
}
@keyframes px-shell-out{
  0%{opacity:1;transform:scale(1) translate3d(0,0,0);}
  100%{opacity:0;transform:scale(.94) translate3d(0,-14px,0);}
}
.px-shell.px-enter{animation:px-shell-in ${IN_MS}ms cubic-bezier(.18,1.24,.32,1) both;}
.px-shell.px-leave{animation:px-shell-out ${OUT_MS}ms cubic-bezier(.3,0,.8,.15) both;}
@media (prefers-reduced-motion: reduce){
  .px-shell.px-enter,.px-shell.px-leave{animation:none !important;}
}
`;

export function PageShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const gen = useRef(0);
  const leaving = useRef(false);
  const based = useRef(false);

  /* Satu-satunya jalan untuk membuat halaman terlihat kembali. Idempoten. */
  const reveal = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("px-leave", "px-enter");
    el.style.opacity = "";
    el.style.transform = "";
    el.style.willChange = "";
    leaving.current = false;
  };

  const enter = () => {
    const el = ref.current;
    if (!el) return;
    reveal();
    if (reducedMotion()) return;
    void el.offsetWidth;
    el.style.willChange = "transform, opacity";
    el.classList.add("px-enter");
    const mine = ++gen.current;
    window.setTimeout(() => {
      if (gen.current !== mine) return;
      el.classList.remove("px-enter");
      el.style.willChange = "";
    }, IN_MS + 90);
  };

  const go = (href: string) => {
    const el = ref.current;
    if (leaving.current) return;
    if (!el || reducedMotion()) { commit(href); return; }
    leaving.current = true;
    const mine = ++gen.current;
    el.style.willChange = "transform, opacity";
    el.classList.remove("px-enter");
    void el.offsetWidth;
    el.classList.add("px-leave");
    window.setTimeout(() => {
      if (gen.current !== mine) return;
      commit(href);
      /* Kalau navigasi gagal/lambat, konten wajib muncul lagi. */
      window.setTimeout(() => {
        if (gen.current !== mine) return;
        reveal();
      }, WATCHDOG_MS);
    }, OUT_MS);
  };

  /* Beranda selalu jadi satu-satunya tujuan back. */
  const commit = (href: string) => {
    if (window.location.pathname === "/") router.push(href);
    else router.replace(href);
  };

  /* Halaman masuk langsung (deep link): susun riwayat jadi [Beranda, Halaman ini]. */
  useEffect(() => {
    if (based.current) return;
    based.current = true;
    try {
      window.history.scrollRestoration = "auto";
      if (window.location.pathname !== "/") {
        const current = window.location.href;
        const state = window.history.state;
        window.history.replaceState(state, "", "/");
        window.history.pushState(state, "", current);
      }
    } catch { /* abaikan */ }
  }, []);

  useEffect(() => {
    gen.current += 1;
    leaving.current = false;
    enter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onAnimEnd = (e: AnimationEvent) => {
      if (e.animationName === "px-shell-in") {
        el.classList.remove("px-enter");
        el.style.willChange = "";
      }
    };

    const onPop = () => {
      if (anyOverlay() || popSuppressed()) return;
      gen.current += 1;
      leaving.current = false;
      if (window.location.pathname !== "/") { router.replace("/"); return; }
      reveal();
      enter();
    };

    const onShow = () => { gen.current += 1; reveal(); };

    const onVisible = () => {
      if (document.visibilityState === "visible" && !leaving.current) {
        if (el.classList.contains("px-leave")) reveal();
      }
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (anyOverlay()) return;
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

    const onCustom = (e: Event) => {
      const href = (e as CustomEvent<{ href?: string }>).detail?.href;
      if (typeof href === "string" && href.startsWith("/")) go(href);
    };

    el.addEventListener("animationend", onAnimEnd);
    window.addEventListener("popstate", onPop);
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("click", onClick, true);
    window.addEventListener("px:navigate", onCustom);

    return () => {
      el.removeEventListener("animationend", onAnimEnd);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("px:navigate", onCustom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
      <div ref={ref} className="px-shell">{children}</div>
    </>
  );
}
