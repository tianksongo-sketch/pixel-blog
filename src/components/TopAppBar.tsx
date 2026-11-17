"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { attachRipple, Icon } from "./ui";
import { navVT } from "@/lib/nav";

export function TopAppBar({ title, large = false, back = false }: { title: string; large?: boolean; back?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!large) { el.style.setProperty("--ab-p", "1"); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      el.style.setProperty("--ab-p", String(Math.min(1, window.scrollY / 72)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [large]);

  return (
    <>
      <header ref={ref} className={`appbar${large ? "" : " appbar-solid"}`}>
        <div className="appbar-bg" />
        <div className="appbar-row container">
          {back && (
            <Link href="/" className="btn b-icon" aria-label="Kembali" onPointerDown={attachRipple}
              onClick={(e) => { e.preventDefault(); navVT(router, "/"); }}>
              <Icon name="arrow_back" size={24} />
            </Link>
          )}
          <span className="appbar-title-sm">{title}</span>
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
  let greet = "";
  let date = "";
  if (now) {
    const h = now.getHours();
    greet = h < 5 ? "Selamat malam" : h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam";
    date = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  return (
    <section className="glance">
      <h2>At a glance</h2>
      <p suppressHydrationWarning>{now ? `${greet} · ${date}` : "\u00A0"}</p>
    </section>
  );
}
