"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
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
    if (taps.current.length >= 5) {
      taps.current = [];
      router.push("/admin");
    }
  };

  return (
    <footer className="footer">
      <span className="copy" role="button" tabIndex={0} onClick={onTap}
        onKeyDown={(e) => { if (e.key === "Enter") onTap(); }} aria-label="Hak cipta">©</span>
      {" 2026 F4KUYY · Material You"}
      <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6 }} data-build={BUILD} title="Versi build yang sedang tayang">
        build {BUILD_LABEL}
      </div>
    </footer>
  );
}
