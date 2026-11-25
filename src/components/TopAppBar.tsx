"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Mode } from "@/lib/theme";
import { haptic, tick } from "@/lib/motion";
import { attachRipple, Icon } from "./ui";
import { useApp } from "./Providers";

const NEXT: Record<Mode, Mode> = { auto: "light", light: "dark", dark: "auto" };
const ICON: Record<Mode, string> = { auto: "brightness_auto", light: "light_mode", dark: "dark_mode" };
const LABEL: Record<Mode, string> = { auto: "Auto", light: "Light", dark: "Dark" };

const stealth: CSSProperties = {
  background: "none", border: 0, padding: 0, margin: 0,
  font: "inherit", color: "inherit", letterSpacing: "inherit",
  textAlign: "left", cursor: "default", display: "block", width: "100%",
  userSelect: "none", WebkitTapHighlightColor: "transparent"
};

/* Header sticky tinggi KONSTAN. Latar blur & judul kecil hanya toggle class
   sekali saat melewati ambang scroll — tanpa penulisan layout per frame,
   jadi tidak ada flicker. */
const BAR_CSS = `
.ab2{position:sticky;top:0;z-index:40;padding-top:var(--safe-t,0px)}
.ab2-row{position:relative;display:flex;align-items:center;gap:6px;height:60px}
.ab2-bg{
  position:absolute;inset:0;pointer-events:none;
  background-color:color-mix(in srgb,var(--canvas,#000) 90%,transparent);
  background-image:linear-gradient(180deg,var(--g-fill-2,rgba(255,255,255,.1)),transparent);
  backdrop-filter:blur(26px) saturate(150%) brightness(1.05);
  -webkit-backdrop-filter:blur(26px) saturate(150%) brightness(1.05);
  border-bottom:1px solid var(--g-line,rgba(255,255,255,.14));
  box-shadow:inset 0 1px 0 var(--g-top,rgba(255,255,255,.5)),0 12px 32px rgba(0,0,0,.38);
  opacity:0;visibility:hidden;
  transition:opacity .32s cubic-bezier(.16,1,.3,1),visibility 0s linear .32s;
}
.ab2.is-scrolled .ab2-bg,
.ab2-solid .ab2-bg{
  opacity:1;visibility:visible;
  transition:opacity .32s cubic-bezier(.16,1,.3,1);
}
@supports not ((backdrop-filter:blur(2px)) or (-webkit-backdrop-filter:blur(2px))){
  .ab2-bg{background-color:var(--canvas,#000)}
}
.ab2-title{
  font-family:var(--font-ui,inherit);font-weight:800;text-transform:uppercase;
  letter-spacing:.1em;font-size:12.5px;color:var(--ink,#fff);
  opacity:0;transform:translateY(8px);min-width:0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  transition:opacity .32s cubic-bezier(.16,1,.3,1),transform .32s cubic-bezier(.16,1,.3,1);
}
.ab2.is-scrolled .ab2-title,
.ab2-solid .ab2-title{opacity:1;transform:none}
.ab2-actions{margin-left:auto;display:flex;align-items:center;gap:2px;flex:none}
.ab2-actions .btn.b-icon{
  width:40px;height:40px;min-height:40px;padding:0;border:0;border-radius:50%;
  color:var(--g-dim,rgba(255,255,255,.66));background:transparent;
}
.ab2-actions .btn.b-icon:hover{color:var(--ink,#fff);background:var(--g-fill-2,rgba(255,255,255,.1))}

/* Hero kini konten aliran biasa: ikut ter-scroll, tidak mengubah tinggi header. */
.ab2-hero{position:relative;padding:14px 0 20px}
.ab2-hero h1{
  font-family:var(--font-display,"Anton",sans-serif);font-weight:400;text-transform:uppercase;
  font-size:clamp(38px,9vw,72px);line-height:.92;letter-spacing:.005em;color:var(--ink,#fff);
  margin:0;width:100%;
}
.ab2-hero h1 button{all:unset;cursor:default;display:block;width:100%;user-select:none;-webkit-user-select:none}
`;

const CLOCK_CSS = `
.mc{display:inline-flex;align-items:center;margin-right:2px}
.mc-face{
  position:relative;display:inline-flex;align-items:baseline;gap:1px;
  padding:7px 13px;border-radius:var(--g-pill,999px);
  background:linear-gradient(150deg,var(--g-fill-2,rgba(255,255,255,.1)),transparent);
  border:1px solid var(--g-line,rgba(255,255,255,.14));
  backdrop-filter:blur(18px) brightness(1.06);
  -webkit-backdrop-filter:blur(18px) brightness(1.06);
  box-shadow:inset 0 1px 0 var(--g-top,rgba(255,255,255,.5));
  overflow:hidden;
}
.mc-face::after{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:linear-gradient(100deg,transparent 42%,rgba(255,255,255,.15) 50%,transparent 58%);
  transform:translateX(-100%);
  animation:mc-sweep calc(9s * var(--mo,1)) var(--g-ease,cubic-bezier(.16,1,.3,1)) infinite;
}
@keyframes mc-sweep{0%,74%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.mc-digits{
  display:inline-flex;font-family:var(--font-num,ui-monospace,monospace);
  font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.03em;
  line-height:1;color:var(--ink,#fff);font-size:15px;
}
.mc-col{position:relative;display:inline-grid;width:.62em;height:1.06em;overflow:hidden}
.mc-d{grid-area:1/1;display:block;text-align:center}
.mc-sep{opacity:.38;padding:0 1px}
.mc-sec{font-size:.5em;margin-left:6px;align-self:flex-start;margin-top:.16em;opacity:.5}
.mc-day{
  margin-left:10px;font-family:var(--font-num,ui-monospace);font-size:10px;
  letter-spacing:.12em;text-transform:uppercase;color:var(--g-dim-2,rgba(255,255,255,.55));white-space:nowrap;
}
@media (max-width:900px){.mc-day{display:none}}
@media (max-width:480px){.mc-sec{display:none}}
:root[data-motion="reduce"] .mc-face::after{animation:none}
@media (prefers-reduced-motion:reduce){.mc-face::after{animation:none}}
`;

const DIGIT_SPRING = { type: "spring" as const, stiffness: 520, damping: 34, mass: .7 };

function Digit({ v }: { v: string }) {
  return (
    <span className="mc-col">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={v} className="mc-d"
          initial={{ y: "0.9em", opacity: 0, filter: "blur(4px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-0.9em", opacity: 0, filter: "blur(4px)" }}
          transition={DIGIT_SPRING}
        >{v}</motion.span>
      </AnimatePresence>
    </span>
  );
}

function MonoClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    let id = 0;
    const beat = () => { setNow(new Date()); id = window.setTimeout(beat, 1000 - (Date.now() % 1000)); };
    id = window.setTimeout(beat, 1000 - (Date.now() % 1000));
    return () => clearTimeout(id);
  }, []);
  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";
  const day = now ? now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }) : "";
  return (
    <div className="mc" suppressHydrationWarning>
      <div className="mc-face">
        <span className="mc-digits" aria-label={now ? `Pukul ${hh} lewat ${mm} menit ${ss} detik` : "memuat jam"}>
          <Digit v={hh[0]} /><Digit v={hh[1]} />
          <span className="mc-sep" aria-hidden="true">:</span>
          <Digit v={mm[0]} /><Digit v={mm[1]} />
          <span className="mc-sec" aria-hidden="true">{ss}</span>
        </span>
      </div>
      {day && <span className="mc-day" aria-hidden="true">{day}</span>}
    </div>
  );
}

export function TopAppBar({ title, large = false, back = false }: { title: string; large?: boolean; back?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const router = useRouter();
  const scrolled = useRef(false);
  const { mode, setMode, adminUi, registerAdminTap, lockAdminUi } = useApp();
  const lp = useRef<number | null>(null);
  const fired = useRef(false);

  /* Hanya toggle class saat melewati ambang — satu kali, bukan tiap frame. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!large) { el.classList.add("is-scrolled"); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const on = window.scrollY > 24;
      if (on !== scrolled.current) {
        scrolled.current = on;
        el.classList.toggle("is-scrolled", on);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [large]);

  useEffect(() => () => { if (lp.current) clearTimeout(lp.current); }, []);

  const down = () => { fired.current = false; lp.current = window.setTimeout(() => { fired.current = true; lockAdminUi(); }, 650); };
  const up = () => { if (lp.current) { clearTimeout(lp.current); lp.current = null; } };
  const clickPencil = () => { if (fired.current) { fired.current = false; return; } haptic(10); router.push("/admin"); };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BAR_CSS + CLOCK_CSS }} />
      <header ref={ref} className={`ab2${large ? "" : " ab2-solid"}`}>
        <div className="ab2-bg" />
        <div className="ab2-row container">
          {back ? (
            <Link href="/" prefetch className="btn b-icon" aria-label="Kembali ke beranda" onPointerDown={attachRipple}>
              <Icon name="arrow_back" size={22} />
            </Link>
          ) : (
            <Link href="/" prefetch className="brand" aria-label="Beranda F4KUYY" style={{ marginLeft: -6 }}>
              <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
            </Link>
          )}
          <span className="ab2-title">{title}</span>
          <div className="ab2-actions">
            <MonoClock />
            {adminUi && (
              <button className="btn b-icon" aria-label="Buka panel admin" title="Panel admin · tekan lama untuk keluar"
                onPointerDown={(e) => { attachRipple(e); down(); }}
                onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onClick={clickPencil}>
                <Icon name="edit" size={21} />
              </button>
            )}
            <button className="btn b-icon" onPointerDown={attachRipple}
              onClick={() => { setMode(NEXT[mode]); haptic(8); tick(640); }}
              aria-label={`Ganti tema, sekarang ${LABEL[mode]}`} title={LABEL[mode]}>
              <Icon name={ICON[mode]} size={21} />
            </button>
          </div>
        </div>
      </header>
      {large && (
        <div className="ab2-hero container">
          <h1>
            <button type="button" onClick={() => registerAdminTap("brand")} aria-label={title} tabIndex={-1}>
              {title}
            </button>
          </h1>
        </div>
      )}
    </>
  );
}

export function Glance() {
  const [now, setNow] = useState<Date | null>(null);
  const { registerAdminTap } = useApp();
  useEffect(() => { setNow(new Date()); }, []);
  let line = "\u00A0";
  if (now) {
    const h = now.getHours();
    const greet = h < 5 ? "Selamat malam" : h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam";
    line = `${greet} · ${now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`;
  }
  return (
    <section className="glance" style={{ paddingTop: 4 }}>
      <h2>
        <button type="button" style={stealth} onClick={() => registerAdminTap("glance")} aria-label="Sekilas">
          Sekilas
        </button>
      </h2>
      <p suppressHydrationWarning>{line}</p>
    </section>
  );
}
