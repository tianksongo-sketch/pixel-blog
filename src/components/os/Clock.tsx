"use client";
import { useEffect, useState } from "react";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    let id = 0;
    const beat = () => { setNow(new Date()); id = window.setTimeout(beat, intervalMs - (Date.now() % intervalMs)); };
    id = window.setTimeout(beat, intervalMs - (Date.now() % intervalMs));
    return () => clearTimeout(id);
  }, [intervalMs]);
  return now;
}

export function StatusClock() {
  const now = useNow(1000);
  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  return <span className="sbar-time" suppressHydrationWarning>{hh}:{mm}</span>;
}

export function BigClock({ onTap }: { onTap?: () => void }) {
  const now = useNow(1000);
  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  return (
    <button className="clock" onClick={onTap} aria-label="Jam" tabIndex={-1} suppressHydrationWarning>
      {hh}:{mm}
    </button>
  );
}

export function DateLine({ className }: { className?: string }) {
  const now = useNow(60000);
  const text = now ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) : "\u00A0";
  return <div className={className} suppressHydrationWarning>{text}</div>;
}

export function GreetLine({ className }: { className?: string }) {
  const now = useNow(60000);
  let text = "\u00A0";
  if (now) {
    const h = now.getHours();
    const g = h < 5 ? "Selamat malam" : h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 19 ? "Selamat sore" : "Selamat malam";
    text = `${g} · ${now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}`;
  }
  return <div className={className} suppressHydrationWarning>{text}</div>;
}
