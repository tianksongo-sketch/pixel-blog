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

/* ---------- jam monokrom tunggal ---------- */
const CLOCK_CSS = `
.mc{display:inline-flex;align-items:center}
.mc-face{
  position:relative;display:inline-flex;align-items:baseline;gap:1px;
  padding:7px 14px;border-radius:var(--g-pill,999px);
  background:linear-gradient(150deg,var(--g-fill-2,rgba(255,255,255,.10)),transparent);
  border:1px solid var(--g-line,rgba(255,255,255,.14));
  backdrop-filter:blur(20px) brightness(1.06);
  -webkit-backdrop-filter:blur(20px) brightness(1.06);
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
  line-height:1;color:var(--ink,#fff);font-size:16px;
}
.mc-col{position:relative;display:inline-grid;width:.62em;height:1.06em;overflow:hidden}
.mc-d{grid-area:1/1;display:block;text-align:center}
.mc-sep{opacity:.38;padding:0 1px}
.mc-sec{font-size:.5em;margin-left:6px;align-self:flex-start;margin-top:.16em;opacity:.5;letter-spacing:0}
.mc-day{
  margin-left:10px;font-family:var(--font-num,ui-monospace);font-size:10px;
  letter-spacing:.12em;text-transform:uppercase;color:var(--g-dim-2,rgba(255,255,255,.4));
  white-space:nowrap;
}
@media (max-width:560px){.mc-sec,.mc-day{display:none}}
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
  const day = now
    ? now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })
    : "";

  return (
    <div className="mc" suppressHydrationWarning>
      <div className="mc-face">
        <span className="mc-digits" aria-label={now ? `${hh}:${mm}:${ss}` : "memuat jam"}>
          <Digit v={hh[0]} /><Digit v={hh[1]} />
          <span className="mc-sep">:</span>
          <Digit v={mm[0]} /><Digit v={mm[1]} />
          <span className="mc-sec">{ss}</span>
        </span>
      </div>
      {day && <span className="mc-day">{day}</span>}
    </div>
  );
}

/* ---------- app bar ---------- */
export function TopAppBar({ title, large = false, back = false }: { title: string; large?: boolean; back?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const router = useRouter();
  const { mode, setMode, adminUi, registerAdminTap, lockAdminUi } = useApp();
  const lp = useRef<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!large) { el.style.setProperty("--ab-p", "1"); return; }
    let raf = 0;
    const update = () => { raf = 0; el.style.setProperty("--ab-p", String(Math.min(1, window.scrollY / 88))); };
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
      <style dangerouslySetInnerHTML={{ __html: CLOCK_CSS }} />
      <header ref={ref} className={`appbar${large ? "" : " appbar-solid"}`}>
        <div className="appbar-bg" />
        <div className="appbar-row container">
          {back ? (
            <Link href="/" prefetch className="btn b-icon" aria-label="Kembali" onPointerDown={attachRipple}>
              <Icon name="arrow_back" size={24} />
            </Link>
          ) : (
            <Link href="/" prefetch className="brand" aria-label="Beranda">
              <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
            </Link>
          )}
          <span className="appbar-title-sm">{title}</span>
          <div className="appbar-actions">
            <MonoClock />
            {adminUi && (
              <button className="btn b-icon" aria-label="Buka panel admin" title="Panel admin · tekan lama untuk keluar"
                onPointerDown={(e) => { attachRipple(e); down(); }}
                onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onClick={clickPencil}>
                <Icon name="edit" size={22} />
              </button>
            )}
            <button className="btn b-icon" onPointerDown={attachRipple}
              onClick={() => { setMode(NEXT[mode]); haptic(8); tick(640); }}
              aria-label={`Tema: ${LABEL[mode]}`} title={LABEL[mode]}>
              <Icon name={ICON[mode]} size={22} />
            </button>
          </div>
        </div>
        {large && (
          <div className="appbar-hero container" style={{ height: "auto", minHeight: 96, paddingBottom: 18 }}>
            <h1 className="appbar-title-lg">
              <button type="button" style={stealth} onClick={() => registerAdminTap("brand")} aria-label={title}>
                {title}
              </button>
            </h1>
          </div>
        )}
      </header>
      <div className={large ? "appbar-space-lg" : "appbar-space-sm"} style={large ? { height: "calc(172px + var(--safe-t))" } : undefined} />
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
    <section className="glance">
      <h2>
        <button type="button" style={stealth} onClick={() => registerAdminTap("glance")} aria-label="At a glance">
          At a glance
        </button>
      </h2>
      <p suppressHydrationWarning>{line}</p>
    </section>
  );
}
