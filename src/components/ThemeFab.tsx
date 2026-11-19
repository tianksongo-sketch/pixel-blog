"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { SEEDS, randomSeed } from "@/lib/theme";
import { attachRipple, Btn, Icon, Sheet } from "./ui";
import { useApp } from "./Providers";

const MODES = [
  { id: "auto", label: "Otomatis", icon: "brightness_auto" },
  { id: "light", label: "Terang", icon: "light_mode" },
  { id: "dark", label: "Gelap", icon: "dark_mode" }
] as const;

export function ThemeFab() {
  const { seed, mode, setTheme, setMode } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openSheet = () => setOpen(true);
    window.addEventListener("px:open-theme", openSheet);
    return () => window.removeEventListener("px:open-theme", openSheet);
  }, []);

  const pick = (s: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    setOpen(false);
    setTimeout(() => setTheme(s, pt), 320);
  };

  return (
    <>
      <motion.button className="fab" aria-label="Acak warna" onPointerDown={attachRipple}
        onClick={() => setOpen(true)}
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 480, damping: 28, delay: 0.3 }}>
        <Icon name="palette" size={24} />
        Warna
      </motion.button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Tema warna">
        <div className="seg" role="group" aria-label="Mode tampilan">
          {MODES.map((m) => (
            <button key={m.id} className={mode === m.id ? "on" : ""} onPointerDown={attachRipple}
              onClick={() => setMode(m.id)} aria-pressed={mode === m.id}>
              <Icon name={mode === m.id ? "check" : m.icon} size={18} weight={600} />
              {m.label}
            </button>
          ))}
        </div>
        <div className="swatch-label">Warna dasar</div>
        <div className="swatch-grid">
          {SEEDS.map((s) => (
            <button key={s} className={`swatch${s === seed ? " sel" : ""}`} style={{ background: s }}
              aria-label={`Warna ${s}`} aria-pressed={s === seed} onPointerDown={attachRipple}
              onClick={(e) => pick(s, e.currentTarget)}>
              {s === seed && <Icon name="check" size={22} weight={700} />}
            </button>
          ))}
        </div>
        <Btn variant="tonal" className="shuffle-btn" onClick={(e) => pick(randomSeed(seed), e.currentTarget)}>
          <Icon name="casino" size={20} />Acak lagi
        </Btn>
      </Sheet>
    </>
  );
}
