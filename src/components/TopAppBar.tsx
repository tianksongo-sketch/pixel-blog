"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { randomSeed, type Mode } from "@/lib/theme";
import { attachRipple, Icon } from "./ui";
import { useApp } from "./Providers";

const NEXT_MODE: Record<Mode, Mode> = { auto: "light", light: "dark", dark: "auto" };
const MODE_ICON: Record<Mode, string> = { auto: "brightness_auto", light: "light_mode", dark: "dark_mode" };
const MODE_LABEL: Record<Mode, string> = { auto: "Otomatis", light: "Terang", dark: "Gelap" };

/* Tanpa ripple, tanpa scale, tanpa cursor pointer: tidak terlihat seperti tombol. */
const stealthTap: CSSProperties = {
  background: "none", border: 0, padding: 0, margin: 0,
  font: "inherit", color: "inherit", letterSpacing: "inherit",
  textAlign: "left", cursor: "default", display: "block", width: "100%",
  userSelect: "none", WebkitTapHighlightColor: "transparent"
};

export function TopAppBar({ title, large = false, back = false }: { title: string; large?: boolean; back?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const router = useRouter();
  const { seed, mode, setMode, setTheme, adminUi, registerAdminTap, lockAdminUi } = useApp();
  const lpTimer = useRef<number | null>(null);
  const lpFired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!large) { el.style.setProperty("--ab-p", "1"); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const progress = Math.min(1, window.scrollY / 76);
      el.style.setProperty("--ab-p", String(progress));
      el.style.setProperty("--ab-hero-height", `${88 * (1 - progress)}px`);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [large]);

  useEffect(() => () => { if (lpTimer.current) clearTimeout(lpTimer.current); }, []);

  const shuffle = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setTheme(randomSeed(seed), { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  const pencilDown = () => {
    lpFired.current = false;
    lpTimer.current = window.setTimeout(() => { lpFired.current = true; lockAdminUi(); }, 650);
  };
  const pencilUp = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; } };
  const pencilClick = () => {
    if (lpFired.current) { lpFired.current = false; return; }
    router.push("/admin");
  };

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
            {adminUi && (
              <button
                className="btn b-icon"
                aria-label="Buka panel admin"
                title="Buka panel admin · tekan lama untuk keluar"
                onPointerDown={(e) => { attachRipple(e); pencilDown(); }}
                onPointerUp={pencilUp} onPointerLeave={pencilUp} onPointerCancel={pencilUp}
                onClick={pencilClick}
              >
                <Icon name="edit" size={24} />
              </button>
            )}
            <button className="btn b-icon" onPointerDown={attachRipple} onClick={() => setMode(NEXT_MODE[mode])}
              aria-label={`Mode tampilan: ${MODE_LABEL[mode]}. Ketuk untuk ganti.`} title={MODE_LABEL[mode]}>
              <Icon name={MODE_ICON[mode]} size={24} />
            </button>
            <button className="btn b-icon" onPointerDown={attachRipple} onClick={(e) => shuffle(e.currentTarget)}
              aria-label="Acak warna tema" title="Acak warna">
              <Icon name="palette" size={24} />
            </button>
          </div>
        </div>
        {large && (
          <div className="appbar-hero container">
            <h1 className="appbar-title-lg">
              <button type="button" style={stealthTap} onClick={() => registerAdminTap("brand")} aria-label={title}>
                {title}
              </button>
            </h1>
          </div>
        )}
      </header>
      <div className={large ? "appbar-space-lg" : "appbar-space-sm"} />
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
        <button type="button" style={stealthTap} onClick={() => registerAdminTap("glance")} aria-label="At a glance">
          At a glance
        </button>
      </h2>
      <p suppressHydrationWarning>{line}</p>
    </section>
  );
}
