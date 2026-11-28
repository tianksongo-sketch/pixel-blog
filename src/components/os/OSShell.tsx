"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "../ui";
import { Wallpaper } from "./Wallpaper";
import { FlowControls } from "./FlowControls";
import { DEFAULT_FLOW, getFlow, loadFlow, setFlow, subscribeFlow, buzz, blip, type FlowPrefs } from "@/lib/flow";
import { useApp } from "../Providers";

type Notif = { id: string; title: string; excerpt: string; createdAt: number };

function pad(n: number) { return String(n).padStart(2, "0"); }

function VSlider({ value, min, max, icon, label, onChange }: {
  value: number; min: number; max: number; icon: string; label: string; onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const pct = ((value - min) / (max - min)) * 100;

  const setFrom = (clientY: number) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, 1 - (clientY - r.top) / r.height));
    onChange(Math.round(min + p * (max - min)));
  };

  return (
    <div className="cc-vs" ref={ref} role="slider" aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max}
      tabIndex={0}
      onPointerDown={(e) => { drag.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} setFrom(e.clientY); buzz(4); }}
      onPointerMove={(e) => { if (drag.current) setFrom(e.clientY); }}
      onPointerUp={() => { drag.current = false; blip(700); }}
      onPointerCancel={() => { drag.current = false; }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(max, value + 4)); }
        if (e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(min, value - 4)); }
      }}>
      <span className="cc-vs-lab">{label}</span>
      <div className="cc-vs-fill" style={{ height: `${pct}%` }} />
      <Icon name={icon} size={22} />
    </div>
  );
}

export function OSShell() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, setMode } = useApp();
  const [prefs, setPrefs] = useState<FlowPrefs>(DEFAULT_FLOW);
  const [now, setNow] = useState<Date | null>(null);
  const [panel, setPanel] = useState<"none" | "cc" | "notif">("none");
  const [capOpen, setCapOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [progress, setProgress] = useState(0);
  const [unlocked, setUnlocked] = useState(true);
  const [battery, setBattery] = useState(100);
  const capRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrefs(loadFlow());
    const un = subscribeFlow(setPrefs);
    try { if (sessionStorage.getItem("px:unlocked") === "1") setUnlocked(true); else setUnlocked(!getFlow().lock); }
    catch { setUnlocked(!getFlow().lock); }
    return un;
  }, []);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> };
    if (typeof nav.getBattery === "function") {
      nav.getBattery().then((b) => setBattery(Math.round(b.level * 100))).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void fetch("/api/search", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => { if (alive && Array.isArray(j.items)) setNotifs(j.items.slice(0, 6)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    setPanel("none"); setCapOpen(false);
  }, [pathname]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const d = document.documentElement;
      const max = d.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setPanel("none"); setCapOpen(false); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setPanel((p) => p === "cc" ? "none" : "cc"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goHome = useCallback(() => {
    buzz(10); blip(520);
    window.dispatchEvent(new CustomEvent("px:navigate", { detail: { href: "/" } }));
  }, []);

  const unlock = useCallback(() => {
    setUnlocked(true);
    try { sessionStorage.setItem("px:unlocked", "1"); } catch {}
    buzz(16); blip(880);
  }, []);

  const app = pathname.startsWith("/post/") ? "Baca"
    : pathname.startsWith("/tulisan") ? "Tulisan"
    : pathname.startsWith("/about") ? "Tentang"
    : pathname.startsWith("/admin") ? "Studio"
    : pathname.startsWith("/pengaturan") ? "Pengaturan"
    : "Beranda";

  const capText = app === "Baca" ? `Membaca · ${Math.round(progress * 100)}%`
    : app === "Beranda" ? "Beranda"
    : `${app}`;

  const hh = now ? pad(now.getHours()) : "--";
  const mm = now ? pad(now.getMinutes()) : "--";
  const dateLong = now ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) : "";

  const cycleMode = () => {
    const next = mode === "dark" ? "light" : mode === "light" ? "auto" : "dark";
    setMode(next); buzz(8); blip(660);
  };

  const cycleWall = () => {
    const order = ["aurora", "lagoon", "dune", "meadow", "summit", "noir"] as const;
    const i = order.indexOf(prefs.wallpaper);
    setPrefs(setFlow({ wallpaper: order[(i + 1) % order.length] }));
    buzz(8); blip(720);
  };

  return (
    <>
      <Wallpaper />

      {/* ---------- status bar ---------- */}
      <div className="sbar">
        <div className="sbar-left">
          <span className="sbar-time" suppressHydrationWarning>{hh}:{mm}</span>
          <button className="sbar-btn" aria-label="Buka notifikasi" onClick={() => { setPanel((p) => p === "notif" ? "none" : "notif"); buzz(6); blip(600); }}>
            <Icon name="notifications" size={19} />
          </button>
        </div>

        <div className={`capsule${capOpen ? " open" : ""}`} ref={capRef} role="button" tabIndex={0}
          aria-label={`Aktivitas: ${capText}`}
          onClick={() => { setCapOpen((v) => !v); buzz(6); blip(760); }}
          onKeyDown={(e) => { if (e.key === "Enter") setCapOpen((v) => !v); }}>
          <span className="cap-dot" />
          {capOpen ? (
            <div className="cap-body">
              <span className="cap-t">{app === "Baca" ? "Sedang membaca" : `Aplikasi ${app}`}</span>
              <span className="cap-sub">{dateLong} · {prefs.wallpaper.charAt(0).toUpperCase() + prefs.wallpaper.slice(1)}</span>
              <div className="cap-bar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
              <span className="cap-sub">{Math.round(progress * 100)}% halaman · ketuk untuk tutup</span>
            </div>
          ) : (
            <span className="cap-t">{capText}</span>
          )}
        </div>

        <div className="sbar-right">
          <button className={`sbar-btn${prefs.sound ? " on" : ""}`}
            aria-label={prefs.sound ? "Matikan semua suara" : "Nyalakan suara"}
            title={prefs.sound ? "Suara aktif" : "Suara mati"}
            onClick={() => { const v = !prefs.sound; setPrefs(setFlow({ sound: v })); if (v) blip(880); buzz(6); }}>
            <Icon name={prefs.sound ? "volume_up" : "volume_off"} size={19} />
          </button>
          <span className="sbar-glyph" aria-hidden="true">
            <Icon name="signal_cellular_alt" size={17} />
            <Icon name="wifi" size={17} />
          </span>
          <span className="sbar-batt" aria-label={`Baterai ${battery} persen`}>
            {battery}<Icon name="battery_full_alt" size={17} />
          </span>
          <button className="sbar-btn" aria-label="Buka pusat kontrol"
            onClick={() => { setPanel((p) => p === "cc" ? "none" : "cc"); buzz(6); blip(640); }}>
            <Icon name="expand_more" size={20} />
          </button>
        </div>
      </div>

      {/* ---------- panel ---------- */}
      <AnimatePresence>
        {panel !== "none" && (
          <>
            <motion.div className="shade-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: .2 }} onClick={() => setPanel("none")} />
            <motion.div className="shade gl gl-rim" role="dialog" aria-modal="true"
              aria-label={panel === "cc" ? "Pusat kontrol" : "Notifikasi"}
              initial={{ opacity: 0, y: -26, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: .97 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}>
              {panel === "cc" ? (
                <>
                  <div className="shade-h">
                    <Icon name="tune" size={19} />
                    <h2>Pusat kontrol</h2>
                    <button className="sbar-btn" aria-label="Tutup" onClick={() => setPanel("none")}><Icon name="close" size={19} /></button>
                  </div>

                  <div className="cc-tiles">
                    <button className="cc-tile on" onClick={cycleMode}>
                      <span className="ic"><Icon name={mode === "light" ? "light_mode" : mode === "dark" ? "dark_mode" : "brightness_auto"} size={20} /></span>
                      <span><b>Tema</b><span>{mode === "auto" ? "Otomatis" : mode === "light" ? "Terang" : "Gelap"}</span></span>
                    </button>
                    <button className="cc-tile on" onClick={cycleWall}>
                      <span className="ic"><Icon name="wallpaper" size={20} /></span>
                      <span><b>Wallpaper</b><span>{prefs.wallpaper}</span></span>
                    </button>
                  </div>

                  <div className="cc-mid">
                    <div className="cc-media">
                      <div className="cc-media-top">
                        {notifs[0] ? (
                          <img className="cc-art" src={`/api/img/${notifs[0].id}`} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                        ) : <span className="cc-art" />}
                        <span className="cc-meta">
                          <b>{notifs[0]?.title ?? "F4KUYY"}</b>
                          <span>{app === "Beranda" ? "Tulisan terbaru" : `Sedang di ${app}`}</span>
                        </span>
                      </div>
                      <div className="cc-track"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
                      <div className="cc-ctrl">
                        <button className="sbar-btn" aria-label="Ke beranda" onClick={goHome}><Icon name="skip_previous" size={20} /></button>
                        <button className="sbar-btn" aria-label="Tulisan terbaru"
                          onClick={() => { setPanel("none"); if (notifs[0]) window.dispatchEvent(new CustomEvent("px:navigate", { detail: { href: `/post/${notifs[0].id}` } })); }}>
                          <Icon name="play_arrow" size={24} />
                        </button>
                        <button className="sbar-btn" aria-label="Semua tulisan"
                          onClick={() => { setPanel("none"); window.dispatchEvent(new CustomEvent("px:navigate", { detail: { href: "/tulisan" } })); }}>
                          <Icon name="skip_next" size={20} />
                        </button>
                      </div>
                    </div>
                    <VSlider value={prefs.brightness} min={35} max={100} icon="light_mode" label="Cahaya"
                      onChange={(v) => setPrefs(setFlow({ brightness: v }))} />
                    <VSlider value={prefs.blur} min={0} max={48} icon="blur_on" label="Kaca"
                      onChange={(v) => setPrefs(setFlow({ blur: v }))} />
                  </div>

                  <div className="cc-dots">
                    {([
                      { k: "sound", icon: "volume_up", label: "Suara" },
                      { k: "haptic", icon: "vibration", label: "Getar" },
                      { k: "reduce", icon: "motion_photos_off", label: "Tenang" },
                      { k: "lock", icon: "lock", label: "Kunci" }
                    ] as const).map((d) => (
                      <button key={d.k} className={`cc-dot${prefs[d.k] ? " on" : ""}`} aria-pressed={prefs[d.k]}
                        aria-label={d.label} title={d.label}
                        onClick={() => { const v = !prefs[d.k]; setPrefs(setFlow({ [d.k]: v } as Partial<FlowPrefs>)); buzz(8); if (d.k === "sound" && v) blip(880); }}>
                        <Icon name={d.icon} size={21} />
                      </button>
                    ))}
                  </div>

                  <FlowControls prefs={prefs} onChange={setPrefs} compact />

                  <button className="fc-act" style={{ width: "100%", marginTop: 12, height: 44 }}
                    onClick={() => { setPanel("none"); router.push("/pengaturan"); }}>
                    <Icon name="settings" size={16} />Pengaturan lengkap
                  </button>
                </>
              ) : (
                <>
                  <div className="shade-h">
                    <Icon name="notifications" size={19} />
                    <h2>Tulisan terbaru</h2>
                    <button className="sbar-btn" aria-label="Tutup" onClick={() => setPanel("none")}><Icon name="close" size={19} /></button>
                  </div>
                  {notifs.length === 0 && <p style={{ color: "var(--ink3)", fontSize: 13.5 }}>Belum ada tulisan.</p>}
                  {notifs.map((n) => (
                    <Link key={n.id} href={`/post/${n.id}`} className="notif" onClick={() => setPanel("none")}>
                      <span className="notif-ic"><Icon name="article" size={19} /></span>
                      <span className="notif-b">
                        <b>{n.title}</b>
                        <p>{n.excerpt}</p>
                      </span>
                      <Icon name="chevron_right" size={19} />
                    </Link>
                  ))}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---------- rail desktop ---------- */}
      <aside className="rail gl gl-rim" aria-label="Panel tampilan">
        <div className="rail-h">
          <Icon name="tune" size={17} />
          <b>Flow Studio</b>
          <button className={`sbar-btn${prefs.sound ? " on" : ""}`} aria-label={prefs.sound ? "Matikan suara" : "Nyalakan suara"}
            onClick={() => { const v = !prefs.sound; setPrefs(setFlow({ sound: v })); if (v) blip(880); }}>
            <Icon name={prefs.sound ? "volume_up" : "volume_off"} size={17} />
          </button>
        </div>
        <FlowControls prefs={prefs} onChange={setPrefs} compact />
      </aside>

      {/* ---------- home bar ---------- */}
      <div className="homebar">
        <button aria-label="Kembali ke beranda" onClick={goHome} />
      </div>

      {/* ---------- layar kunci ---------- */}
      <AnimatePresence>
        {!unlocked && prefs.lock && (
          <motion.div className="lock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: "-100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            onClick={unlock}
            onPointerUp={(e) => { if (e.clientY < window.innerHeight * 0.6) unlock(); }}>
            <span className="clock-date">{dateLong}</span>
            <div className="clock" style={{ pointerEvents: "none" }}>{hh}:{mm}</div>
            <span className="hint">Ketuk atau geser ke atas untuk membuka</span>
            <button className="fc-act" style={{ marginTop: 18, padding: "0 22px" }} onClick={unlock}>
              <Icon name="lock_open" size={16} />Buka
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
