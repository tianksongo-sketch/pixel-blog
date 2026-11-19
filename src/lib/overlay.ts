let openCount = 0;
let suppressUntil = 0;

export function overlayEnter(): void { openCount += 1; }
export function overlayLeave(): void { openCount = Math.max(0, openCount - 1); }
export function anyOverlay(): boolean { return openCount > 0; }

/** Menandai popstate yang berasal dari penutupan overlay, bukan navigasi halaman. */
export function suppressNextPop(): void { suppressUntil = Date.now() + 450; }
export function popSuppressed(): boolean { return Date.now() < suppressUntil; }
