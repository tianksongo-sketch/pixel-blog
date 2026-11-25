/* ==========================================================================
   MONOKROM. Tidak ada seed, tidak ada palet, tidak ada acak warna.
   Nama export lama dipertahankan supaya Providers/CommandPalette tetap jalan.
   ========================================================================== */

export type Mode = "auto" | "light" | "dark";
export type Vars = Record<string, string>;

/* CATATAN: SEEDS sengaja satu nilai netral. UI pemilih warna sudah dihapus. */
export const SEEDS = ["#FFFFFF"];

export function isSeed(s?: string | null): s is string {
  return typeof s === "string" && s.length > 0;
}
export function randomSeed(): string { return "mono"; }

const DARK: Vars = {
  "primary": "#FFFFFF", "on-primary": "#000000",
  "primary-container": "#1A1A1A", "on-primary-container": "#FFFFFF",
  "secondary": "#D6D6D6", "on-secondary": "#000000",
  "secondary-container": "#161616", "on-secondary-container": "#F2F2F2",
  "tertiary": "#BDBDBD", "on-tertiary": "#000000",
  "tertiary-container": "#121212", "on-tertiary-container": "#EDEDED",
  "error": "#FFFFFF", "on-error": "#000000",
  "error-container": "#1F1F1F", "on-error-container": "#FFFFFF",
  "surface": "#000000", "on-surface": "#FFFFFF", "on-surface-variant": "#9A9A9A",
  "surface-container-lowest": "#000000", "surface-container-low": "#0A0A0A",
  "surface-container": "#101010", "surface-container-high": "#161616",
  "surface-container-highest": "#1E1E1E",
  "surface-dim": "#000000", "surface-bright": "#242424",
  "outline": "#4A4A4A", "outline-variant": "#242424",
  "inverse-surface": "#FFFFFF", "inverse-on-surface": "#000000",
  "inverse-primary": "#000000", "surface-tint": "#FFFFFF",
  "scrim": "#000000", "shadow": "#000000"
};

const LIGHT: Vars = {
  "primary": "#000000", "on-primary": "#FFFFFF",
  "primary-container": "#EDEDED", "on-primary-container": "#000000",
  "secondary": "#2B2B2B", "on-secondary": "#FFFFFF",
  "secondary-container": "#F2F2F2", "on-secondary-container": "#0A0A0A",
  "tertiary": "#454545", "on-tertiary": "#FFFFFF",
  "tertiary-container": "#F6F6F6", "on-tertiary-container": "#141414",
  "error": "#000000", "on-error": "#FFFFFF",
  "error-container": "#E8E8E8", "on-error-container": "#000000",
  "surface": "#FFFFFF", "on-surface": "#000000", "on-surface-variant": "#6A6A6A",
  "surface-container-lowest": "#FFFFFF", "surface-container-low": "#FAFAFA",
  "surface-container": "#F4F4F4", "surface-container-high": "#EDEDED",
  "surface-container-highest": "#E4E4E4",
  "surface-dim": "#DEDEDE", "surface-bright": "#FFFFFF",
  "outline": "#B4B4B4", "outline-variant": "#E2E2E2",
  "inverse-surface": "#000000", "inverse-on-surface": "#FFFFFF",
  "inverse-primary": "#FFFFFF", "surface-tint": "#000000",
  "scrim": "#000000", "shadow": "#000000"
};

export function schemeVars(_seed?: string): { light: Vars; dark: Vars } {
  return { light: { ...LIGHT }, dark: { ...DARK } };
}

export function varsToCss(v: Vars, important = false): string {
  return Object.entries(v).map(([k, val]) => `--md-${k}:${val}${important ? " !important" : ""}`).join(";");
}

export function themeCss(_seed?: string): string {
  const { light, dark } = schemeVars();
  return [
    `:root{${varsToCss(light)};color-scheme:light}`,
    `@media (prefers-color-scheme: dark){:root:not([data-mode="light"]){${varsToCss(dark, true)};color-scheme:dark !important}}`,
    `:root[data-mode="dark"]{${varsToCss(dark, true)};color-scheme:dark !important}`
  ].join("\n");
}

export function effectiveDark(mode: Mode): boolean {
  if (typeof window === "undefined") return true;
  return mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function updateThemeMetas(_seed: string, mode: Mode): void {
  if (typeof document === "undefined") return;
  const c = effectiveDark(mode) ? "#000000" : "#FFFFFF";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", c));
}

export function applyThemeDom(_seed: string, mode: Mode): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById("px-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "px-theme";
    document.head.appendChild(el);
  }
  el.textContent = themeCss();
  const root = document.documentElement;
  Object.entries(LIGHT).forEach(([k, v]) => root.style.setProperty(`--md-${k}`, v));
  root.dataset.mode = mode;
  updateThemeMetas("mono", mode);
}
