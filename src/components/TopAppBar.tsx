"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { randomSeed, type Mode } from "@/lib/theme";
import { attachRipple, Icon } from "./ui";
import { useApp } from "./Providers";

const NEXT_MODE: Record<Mode, Mode> = { auto: "light", light: "dark", dark: "auto" };
const MODE_ICON: Record<Mode, string> = { auto: "brightness_auto", light: "light_mode", dark: "dark_mode" };
const MODE_LABEL: Record<Mode, string> = { auto: "Otomatis", light: "Terang", dark: "Gelap" };

export function TopAppBar({ title, large = false, back = false }: { title: string; large?: boolean; back?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { seed, mode, setMode, setTheme } = useApp();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!large) { el.style.setProperty("--ab-p", "1"); return; }
    let raf = 0;
    const update = () => { raf = 0; el.style.setProperty("--ab-p", String(Math.min(1, window.scrollY / 76))); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [large]);

  const shuffle = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setTheme(randomSeed(seed), { x: r.left + r.width / 2, y: r.top + r.height / 2 });
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
            <h1 className="appbar-title-lg">{title}</h1>
          </div>
        )}
      </header>
      <div className={large ? "appbar-space-lg" : "appbar-space-sm"} />
    </>
  );
}

export function Glance() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); }, []);
  let line = "\u00A0";
  if (now) {
    const h = now.getHours();
    const greet = h < 5 ? "Selamat malam" : h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam";
    line = `${greet} · ${now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`;
  }
  return (
    <section className="glance">
      <h2>At a glance</h2>
      <p suppressHydrationWarning>{line}</p>
    </section>
  );
}
