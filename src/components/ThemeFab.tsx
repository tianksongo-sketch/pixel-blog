"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { attachRipple, Btn, Icon, Sheet, Switch } from "./ui";
import { useApp } from "./Providers";
import { DEFAULT_MOTION, getMotion, haptic, loadMotion, setMotion, subscribeMotion, tick, type MotionPrefs } from "@/lib/motion";
import type { Mode } from "@/lib/theme";

const MODES: Array<{ id: Mode; label: string; icon: string }> = [
  { id: "auto", label: "Auto", icon: "brightness_auto" },
  { id: "light", label: "Light", icon: "light_mode" },
  { id: "dark", label: "Dark", icon: "dark_mode" }
];

/* CATATAN: nama export tetap ThemeFab supaya Providers tidak perlu diubah.
            Isinya sekarang panel pengaturan — pemilih warna dihapus total. */
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
    return () => { un(); window.removeEventListener("px:open-theme", buka); window.removeEventListener("px:open-settings", buka); };
  }, []);

  const ubah = (patch: Partial<MotionPrefs>) => { setP(setMotion(patch)); haptic(6); tick(720); };

  return (
    <>
      <motion.button className="fab" aria-label="Pengaturan tampilan"
        onPointerDown={(e) => { attachRipple(e); haptic(6); }}
        onClick={() => { setOpen(true); tick(600); }}
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 24, delay: .3 }}>
        <Icon name="tune" size={22} />
        Tampilan
      </motion.button>

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
          Blog ini monokrom. Tidak ada pemilih warna — hitam dan putih saja, mengikuti tema perangkatmu.
        </p>
      </Sheet>
    </>
  );
}
