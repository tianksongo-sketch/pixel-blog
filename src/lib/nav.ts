"use client";

/** Navigasi lewat PageShell supaya ikut transisi halaman. */
export function navVT(router: { push: (h: string) => void; prefetch?: (h: string) => void }, href: string): void {
  if (typeof window === "undefined") return;
  const ev = new CustomEvent("px:navigate", { detail: { href } });
  const handled = window.dispatchEvent(ev);
  if (!handled) router.push(href);
}

export function warm(router: { prefetch?: (h: string) => void }, href: string): void {
  try { router.prefetch?.(href); } catch { /* abaikan */ }
}
