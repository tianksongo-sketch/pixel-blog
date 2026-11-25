"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./ui";
import {
  DEFAULT_GLASS, LIMITS, PRESETS, applyGlass, glassCss, loadGlass,
  randomGlass, saveGlass, type GlassSettings
} from "@/lib/glass";

const FIELDS: Array<{ key: keyof typeof LIMITS; label: string }> = [
  { key: "blur", label: "Blur" },
  { key: "tint", label: "Tint" },
  { key: "saturation", label: "Saturasi" },
  { key: "specular", label: "Spekular" },
  { key: "refraction", label: "Refraksi" },
  { key: "glow", label: "Aurora" },
  { key: "grain", label: "Grain" },
  { key: "radius", label: "Radius" },
  { key: "depth", label: "Paralaks" },
  { key: "speed", label: "Tempo" },
  { key: "hue", label: "Rotasi hue" }
];

let audioCtx: AudioContext | null = null;
function tink(freq: number) {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.6, t + 0.09);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t); osc.stop(t + 0.32);
  } catch { /* audio tidak tersedia */ }
}

export function GlassStudio() {
  const [s, setS] = useState<GlassSettings>(DEFAULT_GLASS);
  const [min, setMin] = useState(false);
  const [preset, setPreset] = useState("ios");
  const [flash, setFlash] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const soundRef = useRef(false);
  soundRef.current = s.sound;

  useEffect(() => {
    const loaded = loadGlass();
    setS(loaded);
    applyGlass(loaded);
    try { if (localStorage.getItem("px:glass:min") === "1") setMin(true); } catch { /* abaikan */ }
  }, []);

  useEffect(() => {
    applyGlass(s);
    saveGlass(s);
  }, [s]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const set = () => {
      const h = s.on ? el.getBoundingClientRect().height + 14 : 0;
      document.documentElement.style.setProperty("--studio-h", `${Math.round(h)}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    window.addEventListener("resize", set);
    return () => { ro.disconnect(); window.removeEventListener("resize", set); };
  }, [s.on, min]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!soundRef.current) return;
      const t = (e.target as HTMLElement | null)?.closest?.(".btn, .fab, .chip, .gl-preset, .gl-mini, .label-chip");
      if (t) tink(520 + Math.random() * 180);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  const patch = useCallback((p: Partial<GlassSettings>) => {
    setS((prev) => ({ ...prev, ...p }));
    setPreset("");
  }, []);

  const say = (msg: string) => { setFlash(msg); window.setTimeout(() => setFlash(""), 1800); };

  const doExport = async () => {
    const css = glassCss(s);
    try { await navigator.clipboard.writeText(css); say("CSS disalin"); } catch { /* lanjut unduh */ }
    const blob = new Blob([JSON.stringify({ format: "f4kuyy-glass", version: 1, settings: s }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "liquid-glass-theme.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    say("Tema diunduh");
  };

  if (!s.on) {
    return (
      <div ref={rootRef} className="gl-studio min" style={{ width: "auto", left: "50%", padding: 0 }}>
        <div className="gl-studio-head">
          <button className="gl-mini" onClick={() => { setS((p) => ({ ...p, on: true })); tink(720); }}>
            <Icon name="blur_on" size={16} />Nyalakan Liquid Glass
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`gl-studio${min ? " min" : ""}`}>
      <div className="gl-studio-head">
        <span className="gl-studio-title"><Icon name="water_drop" size={17} />Glass Studio</span>
        <div className="gl-presets">
          {PRESETS.map((p) => (
            <button key={p.id} className={`gl-preset${preset === p.id ? " on" : ""}`}
              onClick={() => { setS((prev) => ({ ...prev, ...p.patch, on: true })); setPreset(p.id); tink(660); }}>
              <Icon name={p.icon} size={14} />{p.label}
            </button>
          ))}
        </div>
        <button className="gl-mini" aria-label={min ? "Buka panel" : "Ciutkan panel"}
          onClick={() => { const v = !min; setMin(v); try { localStorage.setItem("px:glass:min", v ? "1" : "0"); } catch { /* abaikan */ } }}>
          <Icon name={min ? "expand_less" : "expand_more"} size={18} />
        </button>
      </div>

      <div className="gl-studio-body">
        {FIELDS.map(({ key, label }) => {
          const l = LIMITS[key];
          const val = s[key] as number;
          const fill = ((val - l.min) / (l.max - l.min)) * 100;
          return (
            <label key={key} className="gl-ctl">
              <span className="gl-ctl-top">
                <span className="gl-ctl-name">{label}</span>
                <span className="gl-ctl-val">{key === "speed" ? val.toFixed(2) : Math.round(val)}{l.unit}</span>
              </span>
              <input
                className="gl-range" type="range" min={l.min} max={l.max} step={l.step} value={val}
                style={{ ["--fill" as string]: `${fill}%` }}
                onChange={(e) => patch({ [key]: Number(e.target.value) } as Partial<GlassSettings>)}
                aria-label={label}
              />
            </label>
          );
        })}
      </div>

      <div className="gl-studio-foot">
        <button className={`gl-mini${s.tone === "light" ? " on" : ""}`}
          onClick={() => patch({ tone: s.tone === "light" ? "dark" : "light" })}>
          <Icon name={s.tone === "light" ? "light_mode" : "dark_mode"} size={15} />
          {s.tone === "light" ? "Terang" : "Gelap"}
        </button>
        <button className={`gl-mini${s.sound ? " on" : ""}`} onClick={() => { const v = !s.sound; setS((p) => ({ ...p, sound: v })); if (v) tink(880); }}>
          <Icon name={s.sound ? "volume_up" : "volume_off"} size={15} />
          {s.sound ? "Suara nyala" : "Suara mati"}
        </button>
        <button className="gl-mini" onClick={() => { setS(randomGlass(s)); setPreset(""); tink(760); }}>
          <Icon name="casino" size={15} />Acak
        </button>
        <button className="gl-mini" onClick={() => { setS({ ...DEFAULT_GLASS, on: true, sound: s.sound }); setPreset("ios"); tink(520); }}>
          <Icon name="restart_alt" size={15} />Reset
        </button>
        <button className="gl-mini" onClick={() => void doExport()}>
          <Icon name="download" size={15} />Ekspor
        </button>
        <button className="gl-mini warn" onClick={() => { setS((p) => ({ ...p, on: false })); }}>
          <Icon name="blur_off" size={15} />Matikan
        </button>
        <AnimatePresence>
          {flash && (
            <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              style={{ fontSize: 12, fontWeight: 700, color: "var(--prism-5)" }}>
              {flash}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
