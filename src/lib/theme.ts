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

type Pal = { tone: (n: number) => number };

/** 26 peran warna M3 + add-on (fixed accent, surface dim/bright). */
export function schemeVars(seed: string): { light: Vars; dark: Vars } {
  const { palettes: p } = themeFromSourceColor(argbFromHex(seed));
  const t = (pal: Pal, tone: number) => hexFromArgb(pal.tone(tone));

  const accent = (pal: Pal, dark: boolean): Vars => {
    const key = pal === p.primary ? "primary" : pal === p.secondary ? "secondary" : "tertiary";
    return {
      [key]: t(pal, dark ? 80 : 40),
      [`on-${key}`]: t(pal, dark ? 20 : 100),
      [`${key}-container`]: t(pal, dark ? 30 : 90),
      [`on-${key}-container`]: t(pal, dark ? 90 : 30),
      /* Fixed: nada tetap di terang & gelap */
      [`${key}-fixed`]: t(pal, 90),
      [`${key}-fixed-dim`]: t(pal, 80),
      [`on-${key}-fixed`]: t(pal, 10),
      [`on-${key}-fixed-variant`]: t(pal, 30)
    };
  };

  const shared = (dark: boolean): Vars => ({
    ...accent(p.primary, dark),
    ...accent(p.secondary, dark),
    ...accent(p.tertiary, dark),
    "error": t(p.error, dark ? 80 : 40),
    "on-error": t(p.error, dark ? 20 : 100),
    "error-container": t(p.error, dark ? 30 : 90),
    "on-error-container": t(p.error, dark ? 90 : 30),
    "surface": t(p.neutral, dark ? 6 : 98),
    "on-surface": t(p.neutral, dark ? 90 : 10),
    "on-surface-variant": t(p.neutralVariant, dark ? 80 : 30),
    "surface-container-lowest": t(p.neutral, dark ? 4 : 100),
    "surface-container-low": t(p.neutral, dark ? 10 : 96),
    "surface-container": t(p.neutral, dark ? 12 : 94),
    "surface-container-high": t(p.neutral, dark ? 17 : 92),
    "surface-container-highest": t(p.neutral, dark ? 22 : 90),
    "surface-dim": t(p.neutral, dark ? 6 : 87),
    "surface-bright": t(p.neutral, dark ? 24 : 98),
    "outline": t(p.neutralVariant, dark ? 60 : 50),
    "outline-variant": t(p.neutralVariant, dark ? 30 : 80),
    "inverse-surface": t(p.neutral, dark ? 90 : 20),
    "inverse-on-surface": t(p.neutral, dark ? 20 : 95),
    "inverse-primary": t(p.primary, dark ? 40 : 80),
    "surface-tint": t(p.primary, dark ? 80 : 40),
    "scrim": "#000000",
    "shadow": "#000000"
  });

  return { light: shared(false), dark: shared(true) };
}

export function varsToCss(v: Vars, important = false): string {
  return Object.entries(v).map(([k, val]) => `--md-${k}:${val}${important ? " !important" : ""}`).join(";");
}

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
