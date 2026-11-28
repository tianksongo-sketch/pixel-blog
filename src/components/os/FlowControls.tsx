"use client";
import { Icon } from "../ui";
import {
  LIMITS, WALLPAPERS, DEFAULT_FLOW, randomFlow, setFlow,
  type FlowPrefs, type NumKey, type ClockStyle
} from "@/lib/flow";
import { buzz, blip } from "@/lib/flow";

const NUMS: Array<{ k: NumKey; label: string }> = [
  { k: "blur", label: "Blur kaca" },
  { k: "glass", label: "Ketebalan" },
  { k: "brightness", label: "Kecerahan" },
  { k: "hue", label: "Geser hue" },
  { k: "grain", label: "Grain" },
  { k: "radius", label: "Sudut" },
  { k: "speed", label: "Tempo" },
  { k: "depth", label: "Paralaks" }
];

const CLOCKS: Array<{ id: ClockStyle; label: string }> = [
  { id: "tall", label: "Tinggi" },
  { id: "soft", label: "Bulat" },
  { id: "wide", label: "Lebar" }
];

export function FlowControls({
  prefs, onChange, compact = false
}: { prefs: FlowPrefs; onChange: (p: FlowPrefs) => void; compact?: boolean }) {
  const patch = (p: Partial<FlowPrefs>) => { onChange(setFlow(p)); buzz(5); };

  const exportPrefs = () => {
    const blob = new Blob([JSON.stringify({ format: "flowos-prefs", version: 1, prefs }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "flowos-tampilan.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    blip(880); buzz(10);
  };

  return (
    <div className="fc-grid">
      <div>
        <div className="fc-lab" style={{ marginBottom: 7 }}>Wallpaper</div>
        <div className="fc-wall">
          {WALLPAPERS.map((w) => (
            <button key={w.id} type="button" className={`fc-sw${prefs.wallpaper === w.id ? " on" : ""}`}
              style={{ background: w.swatch }} aria-label={`Wallpaper ${w.name}`}
              aria-pressed={prefs.wallpaper === w.id}
              onClick={() => { patch({ wallpaper: w.id }); blip(700); }}>
              <span>{w.name}</span>
            </button>
          ))}
        </div>
      </div>

      {NUMS.map(({ k, label }) => {
        const l = LIMITS[k];
        const v = prefs[k];
        const fill = ((v - l.min) / (l.max - l.min)) * 100;
        return (
          <label key={k} className="fc-row">
            <span className="fc-top">
              <span className="fc-lab">{label}</span>
              <span className="fc-val">{k === "speed" ? v.toFixed(2) : Math.round(v)}{l.unit}</span>
            </span>
            <input className="fc-range" type="range" min={l.min} max={l.max} step={l.step} value={v}
              style={{ ["--fill" as string]: `${fill}%` }}
              onChange={(e) => patch({ [k]: Number(e.target.value) } as Partial<FlowPrefs>)}
              aria-label={label} />
          </label>
        );
      })}

      <div>
        <div className="fc-lab" style={{ marginBottom: 7 }}>Gaya jam</div>
        <div className="fc-seg">
          {CLOCKS.map((c) => (
            <button key={c.id} type="button" className={prefs.clock === c.id ? "on" : ""}
              aria-pressed={prefs.clock === c.id}
              onClick={() => { patch({ clock: c.id }); blip(620); }}>{c.label}</button>
          ))}
        </div>
      </div>

      <div className="fc-toggles">
        {([
          { k: "reduce", label: "Tenang", icon: "motion_photos_off" },
          { k: "haptic", label: "Getar", icon: "vibration" },
          { k: "sound", label: "Suara", icon: "volume_up" },
          { k: "lock", label: "Kunci", icon: "lock" }
        ] as const).map((t) => (
          <button key={t.k} type="button" className={`fc-tog${prefs[t.k] ? " on" : ""}`}
            aria-pressed={prefs[t.k]}
            onClick={() => { patch({ [t.k]: !prefs[t.k] } as Partial<FlowPrefs>); blip(t.k === "sound" ? 900 : 640); }}>
            <Icon name={t.icon} size={16} />{t.label}
          </button>
        ))}
      </div>

      <div className="fc-acts">
        <button type="button" className="fc-act" onClick={() => { onChange(setFlow({ ...DEFAULT_FLOW })); buzz(12); blip(520); }}>
          <Icon name="restart_alt" size={15} />Reset
        </button>
        <button type="button" className="fc-act" onClick={() => { onChange(randomFlow()); buzz(14); blip(780); }}>
          <Icon name="casino" size={15} />Acak
        </button>
        <button type="button" className="fc-act" onClick={exportPrefs}>
          <Icon name="download" size={15} />Ekspor
        </button>
      </div>

      {!compact && (
        <p style={{ fontSize: 11.5, color: "var(--ink3)", lineHeight: 1.6, marginTop: 4 }}>
          Semua perubahan langsung diterapkan dan disimpan di perangkat ini.
        </p>
      )}
    </div>
  );
}
