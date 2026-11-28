"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "../ui";
import { Wallpaper } from "./Wallpaper";
import { FlowControls } from "./FlowControls";
import { StatusClock } from "./Clock";
import { DEFAULT_FLOW, getFlow, loadFlow, setFlow, subscribeFlow, buzz, blip, type FlowPrefs } from "@/lib/flow";
import { addFrameTask, bindScrollState, cachedRect, invalidateRect, perf } from "@/lib/perf";
import { useApp } from "../Providers";

type Item = { id: string; title: string; excerpt: string; readMin: number };

/* NAV tanpa "Atur": semua kontrol hidup di Pusat Kontrol & Flow Studio. */
const NAV = [
  { href: "/", label: "Beranda", icon: "home", g: "linear-gradient(145deg,#7A3CFF,#4DA3FF)" },
  { href: "/about", label: "Tentang", icon: "info", g: "linear-gradient(145deg,#0FB5C9,#3DDC84)" },
  { href: "/admin", label: "Studio", icon: "edit_note", g: "linear-gradient(145deg,#FFB020,#FF6A3D)" }
];

function VSlider({ value, min, max, icon, label, onChange }: {
  value: number; min: number; max: number; icon: string; label: string; onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const box = useRef({ top: 0, height: 1 });
  const last = useRef(value);
  const pct = (value - min) / (max - min);

  useEffect(() => {
    last.current = value;
    if (fillRef.current && !drag.current) fillRef.current.style.setProperty("--v", String(pct));
  }, [pct, value]);

  const setFrom = (y: number) => {
    const p = Math.min(1, Math.max(0, 1 - (y - box.current.top) / box.current.height));
    if (fillRef.current) fillRef.current.style.setProperty("--v", p.toFixed(4));
    const v = Math.round(min + p * (max - min));
    if (v !== last.current) { last.current = v; onChange(v); }
  };

  return (
    <div className="cc-vs" ref={ref} role="slider" aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} tabIndex={0}
      onPointerDown={(e) => {
        const el = ref.current; if (!el) return;
        invalidateRect(el);
        const r = cachedRect(el);
        box.current = { top: r.top, height: r.height || 1 };
        drag.current = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
        setFrom(e.clientY); buzz(4);
      }}
      onPointerMove={(e) => { if (drag.current) setFrom(e.clientY); }}
      onPointerUp={() => { drag.current = false; blip(700); }}
      onPointerCancel={() => { drag.current = false; }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(max, value + 4)); }
        if (e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(min, value - 4)); }
      }}>
      <span className="cc-vs-lab">{label}</span>
      <div className="cc-vs-fill" ref={fillRef} style={{ ["--v" as string]: pct }} />
      <Icon name={icon} size={21} />
    </div>
  );
}

export function OSShell() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, setMode } = useApp();
  const [prefs, setPrefs] = useState<FlowPrefs>(DEFAULT_FLOW);
  const [panel, setPanel] = useState<"none" | "cc" | "notif">("none");
  const [capOpen, setCapOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unlocked, setUnlocked] = useState(true);
  const capTextRef = useRef<HTMLSpanElement>(null);
  const laFillRef = useRef<HTMLDivElement>(null);
  const laCarRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const laTrackW = useRef(0);
  const lastPct = useRef(-1);

  const app = pathname.startsWith("/post/") ? "Baca"
    : pathname.startsWith("/about") ? "Tentang"
    : pathname.startsWith("/admin") ? "Studio"
    : "Beranda";
  const appRef = useRef(app); appRef.current = app;

  useEffect(() => {
    setPrefs(loadFlow());
    const un = subscribeFlow(setPrefs);
    const unScroll = bindScrollState();
    try { setUnlocked(sessionStorage.getItem("px:unlocked") === "1" || !getFlow().lock); }
    catch { setUnlocked(!getFlow().lock); }
    let t = 0;
    const onResize = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const q = perf().tier;
        if (document.documentElement.dataset.quality !== q) document.documentElement.dataset.quality = q;
        laTrackW.current = 0;
      }, 200);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => { un(); unScroll(); window.removeEventListener("resize", onResize); window.clearTimeout(t); };
  }, []);

  useEffect(() => {
    let alive = true;
    void fetch("/api/search", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => { if (alive && Array.isArray(j.items)) setItems(j.items.slice(0, 6)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => { setPanel("none"); setCapOpen(false); lastPct.current = -1; }, [pathname]);

  /* "Pengaturan" dari palet perintah / pintasan G-T membuka Pusat Kontrol. */
  useEffect(() => {
    const open = () => setPanel("cc");
    window.addEventListener("px:open-settings", open);
    return () => window.removeEventListener("px:open-settings", open);
  }, []);

  useEffect(() => {
    const stop = addFrameTask((y, mt) => {
      const p = mt.scrollMax > 0 ? Math.min(1, Math.max(0, y / mt.scrollMax)) : 0;
      const pct = Math.round(p * 100);
      if (pct === lastPct.current) return;
      lastPct.current = pct;
      const sx = `scaleX(${p.toFixed(4)})`;
      if (laFillRef.current) laFillRef.current.style.transform = sx;
      if (laCarRef.current) {
        if (!laTrackW.current) {
          const tr = laCarRef.current.parentElement;
          if (tr) laTrackW.current = cachedRect(tr).width || 1;
        }
        laCarRef.current.style.transform = `translate(${(p * laTrackW.current).toFixed(1)}px,-50%)`;
      }
      if (trackRef.current) trackRef.current.style.width = `${pct}%`;
      if (pctRef.current) pctRef.current.textContent = `${pct}% halaman`;
      if (capTextRef.current) {
        capTextRef.current.textContent = appRef.current === "Baca" ? `Membaca · ${pct}%` : appRef.current;
      }
    });
    return stop;
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

  const toggleSound = () => { const v = !prefs.sound; setPrefs(setFlow({ sound: v })); if (v) blip(880); buzz(6); };
  const cycleMode = () => { setMode(mode === "dark" ? "light" : mode === "light" ? "auto" : "dark"); buzz(8); blip(660); };
  const cycleWall = () => {
    const order = ["aurora", "lagoon", "dune", "meadow", "summit", "noir"] as const;
    setPrefs(setFlow({ wallpaper: order[(order.indexOf(prefs.wallpaper) + 1) % order.length] }));
    buzz(8); blip(720);
  };
  const openSearch = () => {
    setPanel("none");
    if (pathname !== "/") { router.push("/"); setTimeout(() => window.dispatchEvent(new Event("px:focus-search")), 420); }
    else window.dispatchEvent(new Event("px:focus-search"));
  };

  return (
    <>
      <Wallpaper />

      <div className="sbar">
        <div className="sbar-l">
          <StatusClock />
          <button className="sbar-btn" aria-label="Notifikasi" onClick={() => { setPanel((p) => p === "notif" ? "none" : "notif"); buzz(6); blip(600); }}>
            <Icon name="notifications" size={19} />
          </button>
        </div>

        <div className="capsule" role="button" tabIndex={0} aria-expanded={capOpen}
          aria-label={`Aktivitas: ${app}`}
          onClick={() => { setCapOpen((v) => !v); buzz(6); blip(760); }}
          onKeyDown={(e) => { if (e.key === "Enter") setCapOpen((v) => !v); }}>
          <span className="cap-dot" />
          <span className="cap-t" ref={capTextRef}>{app}</span>
        </div>

        <div className="sbar-r">
          <button className={`sbar-btn${prefs.sound ? " on" : ""}`} aria-label={prefs.sound ? "Matikan semua suara" : "Nyalakan suara"}
            title={prefs.sound ? "Suara aktif" : "Suara mati"} onClick={toggleSound}>
            <Icon name={prefs.sound ? "volume_up" : "volume_off"} size={19} />
          </button>
          <span className="sbar-glyph" aria-hidden="true">
            <Icon name="signal_cellular_alt" size={16} /><Icon name="wifi" size={16} />
          </span>
          <span className="sbar-batt" aria-hidden="true">100<Icon name="battery_full_alt" size={16} /></span>
          <button className="sbar-btn" aria-label="Pusat kontrol" onClick={() => { setPanel((p) => p === "cc" ? "none" : "cc"); buzz(6); blip(640); }}>
            <Icon name="expand_more" size={20} />
          </button>
        </div>
      </div>

      {/* Live Activity: kapsul melebar jadi kartu perjalanan baca */}
      <AnimatePresence>
        {capOpen && (
          <motion.div className="live-act" role="dialog" aria-label="Aktivitas langsung"
            initial={{ opacity: 0, y: -14, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: .96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32, mass: .8 }}>
            <div className="la-head">
              <Icon name={app === "Baca" ? "auto_stories" : "apps"} size={18} />
              <b>{app === "Baca" ? "Sedang membaca" : `Di ${app}`}</b>
              <button className="sbar-btn" aria-label="Tutup aktivitas" onClick={() => setCapOpen(false)}><Icon name="close" size={17} /></button>
            </div>
            {app === "Baca" ? (
              <>
                <div className="la-track">
                  <div className="la-fill" ref={laFillRef} />
                  <span className="la-node" style={{ left: "0%" }} />
                  <span className="la-node" style={{ left: "50%" }} />
                  <span className="la-node" style={{ left: "100%" }} />
                  <span className="la-car" ref={laCarRef} style={{ left: 0 }}><Icon name="menu_book" size={14} /></span>
                </div>
                <div className="la-labels"><span>Awal</span><span>Isi</span><span>Komentar</span></div>
              </>
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--ink2)" }}>
                {items[0]?.title ?? "Belum ada tulisan."}
              </p>
            )}
            <div className="la-row">
              <button className="btn b-tonal" onClick={() => { setCapOpen(false); goHome(); }}><Icon name="home" size={16} />Beranda</button>
              {items[0] && (
                <button className="btn b-text" onClick={() => {
                  setCapOpen(false);
                  window.dispatchEvent(new CustomEvent("px:navigate", { detail: { href: `/post/${items[0].id}` } }));
                }}>
                  <Icon name="play_arrow" size={16} />Lanjutkan baca
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="leftrail" aria-label="Navigasi utama">
        <Link href="/" className="lr-brand" aria-label="F4KUYY"><Icon name="blur_on" size={22} /></Link>
        {NAV.map((n) => {
          const on = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} prefetch className={`lr-btn${on ? " on" : ""}`} aria-label={n.label} aria-current={on ? "page" : undefined}>
              <Icon name={n.icon} size={23} fill={on} />
              <small>{n.label}</small>
            </Link>
          );
        })}
        <button className="lr-btn" aria-label="Cari" onClick={openSearch}><Icon name="search" size={23} /><small>Cari</small></button>
        <span className="sp" />
        <button className={`lr-btn${prefs.sound ? " on" : ""}`} aria-label="Suara" onClick={toggleSound}>
          <Icon name={prefs.sound ? "volume_up" : "volume_off"} size={22} />
        </button>
        <button className="lr-btn" aria-label="Pusat kontrol" onClick={() => setPanel((p) => p === "cc" ? "none" : "cc")}>
          <Icon name="tune" size={22} />
        </button>
      </nav>

      <aside className="rail" aria-label="Flow Studio">
        <div className="rail-h">
          <Icon name="tune" size={17} /><b>Flow Studio</b>
          <button className={`sbar-btn${prefs.sound ? " on" : ""}`} aria-label="Suara" onClick={toggleSound}>
            <Icon name={prefs.sound ? "volume_up" : "volume_off"} size={17} />
          </button>
        </div>

        <div className="rail-card">
          <h3>Sedang dibuka</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
            <span className="cap-dot" />
            <b style={{ fontSize: 13.5 }}>{app}</b>
            <span ref={pctRef} style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink3)" }}>0% halaman</span>
          </div>
          <div className="cc-track"><i ref={trackRef} /></div>
        </div>

        {items.length > 0 && (
          <div className="rail-card">
            <h3>Tulisan teratas</h3>
            {items.slice(0, 4).map((n, i) => (
              <Link key={n.id} href={`/post/${n.id}`} className="rail-mini">
                <em>{i + 1}</em><span>{n.title}</span>
              </Link>
            ))}
          </div>
        )}

        <FlowControls prefs={prefs} onChange={setPrefs} compact />
      </aside>

      <AnimatePresence>
        {panel !== "none" && (
          <>
            <motion.div className="shade-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: .16 }} onClick={() => setPanel("none")} />
            <motion.div className="shade" role="dialog" aria-modal="true" aria-label={panel === "cc" ? "Pusat kontrol" : "Notifikasi"}
              initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 420, damping: 34, mass: .8 }}>
              {panel === "cc" ? (
                <>
                  <div className="shade-h">
                    <Icon name="tune" size={19} /><h2>Pusat kontrol</h2>
                    <button className="sbar-btn" aria-label="Tutup" onClick={() => setPanel("none")}><Icon name="close" size={19} /></button>
                  </div>

                  <div className="cc-tiles">
                    <button className="cc-tile" onClick={cycleMode}>
                      <span className="ic"><Icon name={mode === "light" ? "light_mode" : mode === "dark" ? "dark_mode" : "brightness_auto"} size={20} /></span>
                      <span><b>Tema</b><span>{mode === "auto" ? "Otomatis" : mode === "light" ? "Terang" : "Gelap"}</span></span>
                    </button>
                    <button className="cc-tile" onClick={cycleWall}>
                      <span className="ic"><Icon name="wallpaper" size={20} /></span>
                      <span><b>Wallpaper</b><span>{prefs.wallpaper}</span></span>
                    </button>
                  </div>

                  <div className="cc-mid">
                    <div className="cc-media">
                      <div className="cc-media-top">
                        <span className="cc-art"><Icon name="auto_stories" size={20} /></span>
                        <span className="cc-meta">
                          <b className="mq"><span>{items[0]?.title ?? "F4KUYY"}</span></b>
                          <span className="sub">{app === "Baca" ? "Sedang dibaca" : "Tulisan terbaru"}</span>
                        </span>
                      </div>
                      <div className="cc-track"><i ref={trackRef} style={{ width: "0%" }} /></div>
                      <div className="cc-ctrl">
                        <button className="sbar-btn" aria-label="Beranda" onClick={goHome}><Icon name="skip_previous" size={19} /></button>
                        <button className="sbar-btn" aria-label="Buka tulisan terbaru"
                          onClick={() => { setPanel("none"); if (items[0]) window.dispatchEvent(new CustomEvent("px:navigate", { detail: { href: `/post/${items[0].id}` } })); }}>
                          <Icon name="play_arrow" size={23} />
                        </button>
                        <button className="sbar-btn" aria-label="Cari" onClick={openSearch}><Icon name="search" size={19} /></button>
                      </div>
                    </div>
                    <VSlider value={prefs.brightness} min={40} max={100} icon="light_mode" label="Cahaya" onChange={(v) => setPrefs(setFlow({ brightness: v }))} />
                    <VSlider value={prefs.blur} min={0} max={40} icon="blur_on" label="Kaca" onChange={(v) => setPrefs(setFlow({ blur: v }))} />
                  </div>

                  <div className="cc-dots">
                    <button className={`cc-dot ring${prefs.sound ? " on" : ""}`} aria-pressed={prefs.sound} aria-label="Suara"
                      onClick={() => { const v = !prefs.sound; setPrefs(setFlow({ sound: v })); if (v) blip(880); buzz(8); }}>
                      <Icon name={prefs.sound ? "volume_up" : "volume_off"} size={21} />
                    </button>
                    <button className={`cc-dot ring${prefs.haptic ? " on" : ""}`} aria-pressed={prefs.haptic} aria-label="Getar"
                      onClick={() => { const v = !prefs.haptic; setPrefs(setFlow({ haptic: v })); buzz(8); }}>
                      <Icon name="vibration" size={21} />
                    </button>
                    <div className="cc-pill">
                      <button className={`cc-dot${prefs.reduce ? " on" : ""}`} aria-pressed={prefs.reduce} aria-label="Kurangi gerak"
                        onClick={() => setPrefs(setFlow({ reduce: !prefs.reduce }))}>
                        <Icon name="motion_photos_off" size={18} />
                      </button>
                      <button className={`cc-dot${prefs.lock ? " on" : ""}`} aria-pressed={prefs.lock} aria-label="Layar kunci"
                        onClick={() => setPrefs(setFlow({ lock: !prefs.lock }))}>
                        <Icon name="lock" size={18} />
                      </button>
                      <button className="cc-dot danger" aria-label="Kunci mode admin"
                        onClick={() => { window.dispatchEvent(new Event("px:lock-admin")); buzz(12); }}>
                        <Icon name="shield" size={18} />
                      </button>
                    </div>
                  </div>

                  <FlowControls prefs={prefs} onChange={setPrefs} compact />
                </>
              ) : (
                <>
                  <div className="shade-h">
                    <Icon name="notifications" size={19} /><h2>Tulisan terbaru</h2>
                    <button className="sbar-btn" aria-label="Tutup" onClick={() => setPanel("none")}><Icon name="close" size={19} /></button>
                  </div>
                  {items.length === 0 && <p style={{ color: "var(--ink3)", fontSize: 13.5 }}>Belum ada tulisan.</p>}
                  {items.map((n) => (
                    <Link key={n.id} href={`/post/${n.id}`} className="notif" onClick={() => setPanel("none")}>
                      <span className="notif-ic"><Icon name="article" size={19} /></span>
                      <span className="notif-b"><b>{n.title}</b><p>{n.excerpt}</p></span>
                      <span className="notif-t">{n.readMin}m<Icon name="expand_more" size={16} /></span>
                    </Link>
                  ))}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dock tray: ikon glossy tanpa label, tanpa tombol Atur */}
      <nav className="dockm" aria-label="Navigasi bawah">
        <Link href="/" className={pathname === "/" ? "on" : ""} aria-label="Beranda" aria-current={pathname === "/" ? "page" : undefined}>
          <span className="dk" style={{ background: NAV[0].g }}><Icon name="home" size={22} fill={pathname === "/"} /></span>
        </Link>
        <button onClick={openSearch} aria-label="Cari tulisan">
          <span className="dk" style={{ background: "linear-gradient(145deg,#3DDC84,#0FB5C9)" }}><Icon name="search" size={22} /></span>
        </button>
        <Link href="/about" className={pathname.startsWith("/about") ? "on" : ""} aria-label="Tentang">
          <span className="dk" style={{ background: NAV[1].g }}><Icon name="info" size={22} fill={pathname.startsWith("/about")} /></span>
        </Link>
        <Link href="/admin" className={pathname.startsWith("/admin") ? "on" : ""} aria-label="Studio admin">
          <span className="dk" style={{ background: NAV[2].g }}><Icon name="edit_note" size={22} fill={pathname.startsWith("/admin")} /></span>
        </Link>
      </nav>

      <AnimatePresence>
        {!unlocked && prefs.lock && (
          <motion.div className="shade-scrim" style={{ zIndex: 90, display: "grid", placeItems: "center" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={unlock}>
            <div style={{ textAlign: "center" }}>
              <div className="clock" style={{ pointerEvents: "none" }}><StatusClock /></div>
              <button className="fc-act" style={{ margin: "18px auto 0", padding: "0 22px" }} onClick={unlock}>
                <Icon name="lock_open" size={16} />Buka
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
