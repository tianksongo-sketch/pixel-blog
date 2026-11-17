import { argbFromHex, hexFromArgb, themeFromSourceColor } from "@material/material-color-utilities";

export const SEEDS = [
  "#4285F4", "#EA4335", "#FBBC04", "#34A853", "#A142F4", "#24C1E0", "#FA7B17",
  "#FF8BCB", "#8AB4F8", "#81C995", "#F28B82", "#C58AF9", "#FDE293", "#5E97F6"
];

export type Mode = "auto" | "light" | "dark";
export type Vars = Record<string, string>;

export function isSeed(s?: string | null): s is string {
  return !!s && SEEDS.includes(s.toUpperCase());
}

export function randomSeed(exclude?: string): string {
  const pool = SEEDS.filter((s) => s !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Skema Material You (TonalSpot) terang & gelap, tone sesuai spesifikasi Pixel. */
export function schemeVars(seed: string): { light: Vars; dark: Vars } {
  const { palettes: p } = themeFromSourceColor(argbFromHex(seed));
  const t = (pal: { tone: (n: number) => number }, tone: number) => hexFromArgb(pal.tone(tone));
  const light: Vars = {
    "primary": t(p.primary, 40), "on-primary": t(p.primary, 100),
    "primary-container": t(p.primary, 90), "on-primary-container": t(p.primary, 10),
    "secondary": t(p.secondary, 40), "on-secondary": t(p.secondary, 100),
    "secondary-container": t(p.secondary, 90), "on-secondary-container": t(p.secondary, 10),
    "tertiary": t(p.tertiary, 40), "on-tertiary": t(p.tertiary, 100),
    "tertiary-container": t(p.tertiary, 90), "on-tertiary-container": t(p.tertiary, 10),
    "error": t(p.error, 40), "on-error": t(p.error, 100),
    "error-container": t(p.error, 90), "on-error-container": t(p.error, 10),
    "surface": t(p.neutral, 98), "on-surface": t(p.neutral, 10),
    "on-surface-variant": t(p.neutralVariant, 30),
    "surface-container-lowest": t(p.neutral, 100),
    "surface-container-low": t(p.neutral, 96),
    "surface-container": t(p.neutral, 94),
    "surface-container-high": t(p.neutral, 92),
    "surface-container-highest": t(p.neutral, 90),
    "outline": t(p.neutralVariant, 50), "outline-variant": t(p.neutralVariant, 80),
    "inverse-surface": t(p.neutral, 20), "inverse-on-surface": t(p.neutral, 95),
    "inverse-primary": t(p.primary, 80), "surface-tint": t(p.primary, 40),
    "scrim": "#000000"
  };
  const dark: Vars = {
    "primary": t(p.primary, 80), "on-primary": t(p.primary, 20),
    "primary-container": t(p.primary, 30), "on-primary-container": t(p.primary, 90),
    "secondary": t(p.secondary, 80), "on-secondary": t(p.secondary, 20),
    "secondary-container": t(p.secondary, 30), "on-secondary-container": t(p.secondary, 90),
    "tertiary": t(p.tertiary, 80), "on-tertiary": t(p.tertiary, 20),
    "tertiary-container": t(p.tertiary, 30), "on-tertiary-container": t(p.tertiary, 90),
    "error": t(p.error, 80), "on-error": t(p.error, 20),
    "error-container": t(p.error, 30), "on-error-container": t(p.error, 90),
    "surface": t(p.neutral, 6), "on-surface": t(p.neutral, 90),
    "on-surface-variant": t(p.neutralVariant, 80),
    "surface-container-lowest": t(p.neutral, 4),
    "surface-container-low": t(p.neutral, 10),
    "surface-container": t(p.neutral, 12),
    "surface-container-high": t(p.neutral, 17),
    "surface-container-highest": t(p.neutral, 22),
    "outline": t(p.neutralVariant, 60), "outline-variant": t(p.neutralVariant, 30),
    "inverse-surface": t(p.neutral, 90), "inverse-on-surface": t(p.neutral, 20),
    "inverse-primary": t(p.primary, 40), "surface-tint": t(p.primary, 80),
    "scrim": "#000000"
  };
  return { light, dark };
}

export function varsToCss(v: Vars, important = false): string {
  return Object.entries(v).map(([k, val]) => `--md-${k}:${val}${important ? " !important" : ""}`).join(";");
}

/** CSS lengkap: default terang + gelap via media query & data-mode. Inline light di <html> jadi fallback. */
export function themeCss(seed: string): string {
  const { light, dark } = schemeVars(seed);
  return [
    `:root{${varsToCss(light)};color-scheme:light}`,
    `@media (prefers-color-scheme: dark){:root:not([data-mode="light"]){${varsToCss(dark, true)};color-scheme:dark !important}}`,
    `:root[data-mode="dark"]{${varsToCss(dark, true)};color-scheme:dark !important}`
  ].join("\n");
}

export function updateThemeMetas(seed: string, mode: Mode): void {
  if (typeof document === "undefined") return;
  const { light, dark } = schemeVars(seed);
  const darkNow = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const c = darkNow ? dark.surface : light.surface;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", c));
}

/** Terapkan tema di sisi klien tanpa reload (dipakai bersama View Transitions). */
export function applyThemeDom(seed: string, mode: Mode): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById("px-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "px-theme";
    document.head.appendChild(el);
  }
  el.textContent = themeCss(seed);
  const root = document.documentElement;
  const { light } = schemeVars(seed);
  Object.entries(light).forEach(([k, v]) => root.style.setProperty(`--md-${k}`, v));
  root.dataset.mode = mode;
  updateThemeMetas(seed, mode);
}
