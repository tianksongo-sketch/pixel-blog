"use client";

/** Navigasi instan: tanpa menunggu View Transition, tanpa jeda buatan. */
export function navVT(router: { push: (h: string) => void; prefetch?: (h: string) => void }, href: string): void {
  router.push(href);
}

export function warm(router: { prefetch?: (h: string) => void }, href: string): void {
  try { router.prefetch?.(href); } catch { /* abaikan */ }
}
