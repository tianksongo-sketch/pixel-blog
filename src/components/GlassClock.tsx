"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const SPRING = { type: "spring" as const, stiffness: 520, damping: 32, mass: 0.7 };

function Column({ value }: { value: string }) {
  return (
    <span className="gl-col">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value} className="gl-digit"
          initial={{ y: "0.9em", opacity: 0, filter: "blur(5px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-0.9em", opacity: 0, filter: "blur(5px)" }}
          transition={SPRING}
        >{value}</motion.span>
      </AnimatePresence>
    </span>
  );
}

export function GlassClock({ variant = "compact" }: { variant?: "compact" | "hero" }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    let id = 0;
    const tick = () => {
      setNow(new Date());
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    id = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(id);
  }, []);

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const ss = now ? String(now.getSeconds()).padStart(2, "0") : "--";
  const pct = now ? now.getSeconds() / 60 : 0;
  const R = 13;
  const C = 2 * Math.PI * R;

  let day = "";
  let sub = "";
  if (now) {
    day = now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
    const h = now.getHours();
    const greet = h < 5 ? "Selamat malam" : h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "lokal";
    sub = `${greet} · ${tz.split("/").pop()?.replace(/_/g, " ")}`;
  }

  return (
    <div className={`gl-clock ${variant}`} suppressHydrationWarning>
      <div className="gl-clock-face gl-lens">
        <span className="gl-digits" aria-label={now ? `${hh}:${mm}:${ss}` : "memuat jam"}>
          <Column value={hh[0]} /><Column value={hh[1]} />
          <span className="gl-sep">:</span>
          <Column value={mm[0]} /><Column value={mm[1]} />
          <span className="gl-sec">{ss}</span>
        </span>
      </div>
      {variant === "hero" && (
        <>
          <svg className="gl-ring" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <circle cx="17" cy="17" r={R} fill="none" stroke="currentColor" strokeOpacity=".16" strokeWidth="3" />
            <circle
              cx="17" cy="17" r={R} fill="none" stroke="url(#gl-ring-grad)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 17 17)"
            />
            <defs>
              <linearGradient id="gl-ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4FE3FF" />
                <stop offset="55%" stopColor="#8B5CFF" />
                <stop offset="100%" stopColor="#FF4FD8" />
              </linearGradient>
            </defs>
          </svg>
          <div className="gl-clock-meta">
            <span className="gl-clock-day">{day || "\u00A0"}</span>
            <span className="gl-clock-sub">{sub || "\u00A0"}</span>
          </div>
        </>
      )}
    </div>
  );
}
