"use client";
import { useEffect, useState } from "react";
import { attachRipple, Btn, Icon, Sheet, Switch } from "./ui";
import { useApp } from "./Providers";
import { DEFAULT_MOTION, haptic, loadMotion, setMotion, subscribeMotion, tick, type MotionPrefs } from "@/lib/motion";
import type { Mode } from "@/lib/theme";

const MODES: Array<{ id: Mode; label: string; icon: string }> = [
  { id: "auto", label: "Auto", icon: "brightness_auto" },
  { id: "light", label: "Light", icon: "light_mode" },
  { id: "dark", label: "Dark", icon: "dark_mode" }
];

const FIX_CSS = `
.card-media img,
.article-hero img,
.article-body img,
.thumb,
.alp-preview img,
.cover-row img,
.photo-preview img,
.rt-editor img,
.gs-tile img { filter: none !important; }
.lqip { filter: blur(18px) !important; }

.appbar { isolation: isolate; }
.appbar-bg {
  opacity: 1 !important;
  background-color: color-mix(in srgb, var(--canvas) 88%, transparent) !important;
  background-image: linear-gradient(180deg, var(--g-fill-2), transparent) !important;
  backdrop-filter: blur(28px) saturate(150%) brightness(1.06) !important;
  -webkit-backdrop-filter: blur(28px) saturate(150%) brightness(1.06) !important;
  border: 0 !important;
  border-bottom: 1px solid var(--g-line) !important;
  box-shadow: inset 0 1px 0 var(--g-top), 0 12px 34px rgba(0,0,0,.42) !important;
}
:root[data-mode="light"] .appbar-bg { box-shadow: inset 0 1px 0 var(--g-top), 0 12px 30px rgba(0,0,0,.10) !important; }
@supports not ((backdrop-filter: blur(2px)) or (-webkit-backdrop-filter: blur(2px))) {
  .appbar-bg { background-color: var(--canvas) !important; }
}
.appbar-title-sm { opacity: var(--ab-p, 1); }
.appbar-solid .appbar-title-sm { opacity: 1; }

.fab-admin,
.fab-top { bottom: calc(16px + var(--nav-h, 0px) + var(--safe-b)) !important; }
.snackbar { bottom: calc(84px + var(--nav-h, 0px) + var(--safe-b)) !important; }

.page { padding-bottom: calc(112px + var(--nav-h, 0px) + var(--safe-b)) !important; }
`;

export function ThemeFab() {
  const { mode, setMode, adminUi, lockAdminUi } = useApp();
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<MotionPrefs>(DEFAULT_MOTION);

  useEffect(() => {
    setP(loadMotion());
    const un = subscribeMotion(setP);
    const buka = () => setOpen(true);
    window.addEventListener("px:open-theme", buka);
    window.addEventListener("px:open-settings", buka);
    return () => {
      un();
      window.removeEventListener("px:open-theme", buka);
      window.removeEventListener("px:open-settings", buka);
    };
  }, []);

  const ubah = (patch: Partial<MotionPrefs>) => { setP(setMotion(patch)); haptic(6); tick(720); };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FIX_CSS }} />

      <Sheet open={open} onClose={() => setOpen(false)} title="Pengaturan">
        <div className="gl-ctl-name" style={{ marginBottom: 10 }}>Tema</div>
        <div className="seg" role="group" aria-label="Mode tampilan">
          {MODES.map((m) => (
            <button key={m.id} className={mode === m.id ? "on" : ""}
              onPointerDown={attachRipple} aria-pressed={mode === m.id}
              onClick={() => { setMode(m.id); haptic(8); tick(660); }}>
              <Icon name={mode === m.id ? "check" : m.icon} size={16} weight={700} />
              {m.label}
            </button>
          ))}
        </div>

        <div className="set-row">
          <div className="set-copy">
            <strong>Lebay mode</strong>
            <span>Animasi 2× lebih dramatis</span>
          </div>
          <Switch checked={p.lebay} onChange={(v) => ubah({ lebay: v })} label="Lebay mode" />
        </div>

        <div className="set-row">
          <div className="set-copy">
            <strong>Haptic</strong>
            <span>Getar halus saat menekan</span>
          </div>
          <Switch checked={p.haptic} onChange={(v) => ubah({ haptic: v })} label="Haptic" />
        </div>

        <div className="set-row">
          <div className="set-copy">
            <strong>Suara antarmuka</strong>
            <span>Tick pelan · mati secara bawaan</span>
          </div>
          <Switch checked={p.sound} onChange={(v) => { setP(setMotion({ sound: v })); if (v) tick(880); }} label="Suara antarmuka" />
        </div>

        <div className="set-row">
          <div className="set-copy">
            <strong>Kurangi gerak</strong>
            <span>Matikan semua animasi</span>
          </div>
          <Switch checked={p.reduce} onChange={(v) => ubah({ reduce: v })} label="Kurangi gerak" />
        </div>

        {adminUi && (
          <div className="storage-chip" style={{ marginTop: 16 }}>
            <Icon name="admin_panel_settings" size={18} />
            <span>Mode admin aktif di perangkat ini.</span>
            <Btn variant="tonal" onClick={() => { lockAdminUi(); setOpen(false); }}>
              <Icon name="logout" size={16} />Keluar
            </Btn>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <Btn variant="tonal" style={{ flex: "1 1 160px", height: 46 }}
            onClick={() => { setP(setMotion({ ...DEFAULT_MOTION })); haptic(10); }}>
            <Icon name="restart_alt" size={18} />Reset preferensi
          </Btn>
          <Btn variant="filled" style={{ flex: "1 1 120px", height: 46 }} onClick={() => setOpen(false)}>
            <Icon name="check" size={18} />Tutup
          </Btn>
        </div>

        <p className="set-note">
          <Icon name="contrast" size={15} />
          Antarmuka hitam-putih. Foto postingan tetap berwarna penuh.
        </p>
      </Sheet>
    </>
  );
}
