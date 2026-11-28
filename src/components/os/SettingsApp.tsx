"use client";
import { useEffect, useState } from "react";
import { Icon } from "../ui";
import { FlowControls } from "./FlowControls";
import { DEFAULT_FLOW, loadFlow, subscribeFlow, type FlowPrefs } from "@/lib/flow";
import { useApp } from "../Providers";

export function SettingsApp() {
  const { mode, setMode, adminUi, lockAdminUi } = useApp();
  const [prefs, setPrefs] = useState<FlowPrefs>(DEFAULT_FLOW);

  useEffect(() => {
    setPrefs(loadFlow());
    return subscribeFlow(setPrefs);
  }, []);

  return (
    <>
      <section className="widget gl gl-rim" style={{ marginBottom: 14 }}>
        <div className="widget-h"><Icon name="palette" size={16} /><b>Mode tampilan</b></div>
        <div className="fc-seg">
          {(["auto", "light", "dark"] as const).map((m) => (
            <button key={m} className={mode === m ? "on" : ""} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === "auto" ? "Otomatis" : m === "light" ? "Terang" : "Gelap"}
            </button>
          ))}
        </div>
      </section>

      <section className="widget gl gl-rim">
        <div className="widget-h"><Icon name="tune" size={16} /><b>Panel kaca &amp; gerak</b></div>
        <FlowControls prefs={prefs} onChange={setPrefs} />
      </section>

      {adminUi && (
        <section className="widget gl gl-rim" style={{ marginTop: 14 }}>
          <div className="widget-h"><Icon name="admin_panel_settings" size={16} /><b>Mode admin</b></div>
          <p style={{ fontSize: 13, color: "var(--ink2)", marginBottom: 12 }}>
            Pintasan admin aktif di perangkat ini. Tekan lama ikon pensil di bar atas atau kunci dari sini.
          </p>
          <button className="fc-act" style={{ width: "100%", height: 44 }} onClick={lockAdminUi}>
            <Icon name="logout" size={16} />Kunci mode admin
          </button>
        </section>
      )}
    </>
  );
}
