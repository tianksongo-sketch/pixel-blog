"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { haptic, tick } from "@/lib/motion";
import { attachRipple } from "./ui";
import { BUILD, BUILD_LABEL } from "@/lib/version";
import { useApp } from "./Providers";

export function Footer() {
  const router = useRouter();
  const { snack } = useApp();
  const taps = useRef<number[]>([]);

  const onTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now];
    if (taps.current.length === 3) snack("2 ketukan lagi…");
    if (taps.current.length >= 5) { taps.current = []; router.push("/admin"); }
  };

  const openSettings = () => {
    window.dispatchEvent(new Event("px:open-settings"));
    haptic(6); tick(560);
  };

  return (
    <footer className="footer">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
        <button
          type="button" onPointerDown={attachRipple} onClick={openSettings}
          className="btn b-text" style={{ minHeight: 32, fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" }}
        >
          Pengaturan
        </button>
        <span className="dot" />
        <span>
          <span className="copy" role="button" tabIndex={0} onClick={onTap}
            onKeyDown={(e) => { if (e.key === "Enter") onTap(); }} aria-label="Hak cipta">©</span>
          {" 2026 F4KUYY"}
        </span>
        <span className="dot" />
        <span data-build={BUILD} title="Versi build">{BUILD_LABEL}</span>
      </div>
      <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", opacity: .55 }}>
        Hitam · Putih · Kaca
      </div>
    </footer>
  );
}
