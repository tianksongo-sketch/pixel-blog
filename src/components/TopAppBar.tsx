"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Mode } from "@/lib/theme";
import { haptic, tick } from "@/lib/motion";
import { attachRipple, Icon } from "./ui";
import { useApp } from "./Providers";
import { GlassClock } from "./GlassClock";

const NEXT: Record<Mode, Mode> = { auto: "light", light: "dark", dark: "auto" };
const ICON: Record<Mode, string> = { auto: "brightness_auto", light: "light_mode", dark: "dark_mode" };
const LABEL: Record<Mode, string> = { auto: "Auto", light: "Light", dark: "Dark" };

const stealth: CSSProperties = {
  background: "none", border: 0, padding: 0, margin: 0,
  font: "inherit", color: "inherit", letterSpacing: "inherit",
  textAlign: "left", cursor: "default", display: "block", width: "100%",
  userSelect: "none", WebkitTapHighlightColor: "transparent"
};

export function TopAppBar({ title, large = false, back = false }: { title: string; large?: boolean; back?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const router = useRouter();
  const { mode, setMode, adminUi, registerAdminTap, lockAdminUi } = useApp();
  const lp = useRef<number | null>(null);
  const fired = useRef(false);
  const [hasClock, setHasClock] = useState(false);

  useEffect(() => {
    /* GlassClock hanya ada bila kamu sudah memasangnya dari versi sebelumnya. */
    setHasClock(typeof GlassClock === "function");
  }, []);

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
            {hasClock && <GlassClock variant="compact" />}
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
            <button className="btn b-icon" onPointerDown={attachRipple}
              onClick={() => { window.dispatchEvent(new Event("px:open-settings")); tick(560); }}
              aria-label="Pengaturan tampilan" title="Pengaturan">
              <Icon name="tune" size={22} />
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
      <div className={large ? "appbar-space-lg" : "appbar-space-sm"} style={large ? { height: "calc(184px + var(--safe-t))" } : undefined} />
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
