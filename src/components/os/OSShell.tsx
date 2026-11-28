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
import { useApp } from "../Providers";

type Item = { id: string; title: string; excerpt: string; readMin: number };

const NAV = [
  { href: "/", label: "Beranda", icon: "home" },
  { href: "/about", label: "Tentang", icon: "info" },
  { href: "/admin", label: "Studio", icon: "edit_note" },
  { href: "/pengaturan", label: "Atur", icon: "tune" }
];

function VSlider({ value, min, max, icon, label, onChange }: {
  value: number; min: number; max: number; icon: string; label: string; onChange: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const pct = ((value - min) / (max - min)) * 100;
  const setFrom = (y: number) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, 1 - (y - r.top) / r.height));
    onChange(Math.round(min + p * (max - min)));
  };
  return (
    <div className="cc-vs" ref={ref} role="slider" aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} tabIndex={0}
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
  const [items, setItems] = useState<Item[]>([]);
  const [unlocked, setUnlocked] = useState(true);
  const capTextRef = useRef<HTMLSpanElement>(null);
  const capBarRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const app = pathname.startsWith("/post/") ? "Baca"
    : pathname.startsWith("/about") ? "Tentang"
    : pathname.startsWith("/admin") ? "Studio"
    : pathname.startsWith("/pengaturan") ? "Pengaturan"
    : "Beranda";
  const appRef = useRef(app); appRef.current = app;

  useEffect(() => {
    setPrefs(loadFlow());
    const un = subscribeFlow(setPrefs);
    try { setUnlocked(sessionStorage.getItem("px:unlocked") === "1" || !getFlow().lock); }
    catch { setUnlocked(!getFlow().lock); }
    const onResize = () => setPrefs((p) => { const n = { ...p }; return n; });
    window.addEventListener("resize", onResize, { passive: true });
    return () => { un(); window.removeEventListener("resize", onResize); };
  }, []);

  useEffect(() => {
    let alive = true;
    void fetch("/api/search", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j) => { if (alive && Array.isArray(j.items)) setItems(j.items.slice(0, 6)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => { setPanel("none"); }, [pathname]);

  /* progres ditulis langsung ke DOM — tidak ada re-render React per frame */
  useEffect(() => {
    let raf = 0;
    const write = () => {
      raf = 0;
      const d = document.documentElement;
      const max = d.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const pct = Math.round(p * 100);
      const w = `${pct}%`;
      if (capBarRef.current) capBarRef.current.style.width = w;
      if (trackRef.current) trackRef.current.style.width = w;
      if (pctRef.current) pctRef.current.textContent = `${pct}% halaman`;
      if (capTextRef.current) {
        capTextRef.current.textContent = appRef.current === "Baca" ? `Membaca · ${pct}%` : appRef.current;
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(write); };
    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel("none");
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
    if (pathname !== "/") { router.push("/"); setTimeout(() => window.dispatchEvent(new Event("px:focus-search")), 520); }
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

        <div className="capsule" role="status" aria-live="off">
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

      <aside className="rail" aria-label="Panel tampilan">
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
          <div className="cc-track"><i ref={trackRef} style={{ width: "0%" }} /></div>
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
              transition={{ duration: .18 }} onClick={() => setPanel("none")} />
            <motion.div className="shade" role="dialog" aria-modal="true" aria-label={panel === "cc" ? "Pusat kontrol" : "Notifikasi"}
              initial={{ opacity: 0, y: -20, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: .98 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
              {panel === "cc" ? (
                <>
                  <div className="shade-h">
                    <Icon name="tune" size={19} /><h2>Pusat kontrol</h2>
                    <button className="sbar-btn" aria-label="Tutup" onClick={() => setPanel("none")}><Icon name="close" size={19} /></button>
                  </div>
                  <div className="cc-tiles">
                    <button className="cc-tile" onClick={cycleMode}>
                      <span className="ic"><Icon name={mode === "light" ? "light_mode" : mode === "dark" ? "dark_mode" : "brightness_auto"} size={19} /></span>
                      <span><b>Tema</b><span>{mode === "auto" ? "Otomatis" : mode === "light" ? "Terang" : "Gelap"}</span></span>
                    </button>
                    <button className="cc-tile" onClick={cycleWall}>
                      <span className="ic"><Icon name="wallpaper" size={19} /></span>
                      <span><b>Wallpaper</b><span>{prefs.wallpaper}</span></span>
                    </button>
                  </div>
                  <div className="cc-mid">
                    <div className="cc-media">
                      <div className="cc-media-top">
                        <span className="cc-art" style={{ display: "grid", placeItems: "center" }}><Icon name="auto_stories" size={19} /></span>
                        <span className="cc-meta"><b>{items[0]?.title ?? "F4KUYY"}</b><span>{app}</span></span>
                      </div>
                      <div className="cc-track"><i ref={capBarRef} style={{ width: "0%" }} /></div>
                      <div className="cc-ctrl">
                        <button className="sbar-btn" aria-label="Beranda" onClick={goHome}><Icon name="skip_previous" size={19} /></button>
                        <button className="sbar-btn" aria-label="Tulisan terbaru"
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
                    {([
                      { k: "sound", icon: "volume_up", label: "Suara" },
                      { k: "haptic", icon: "vibration", label: "Getar" },
                      { k: "reduce", icon: "motion_photos_off", label: "Tenang" },
                      { k: "lock", icon: "lock", label: "Kunci" }
                    ] as const).map((d) => (
                      <button key={d.k} className={`cc-dot${prefs[d.k] ? " on" : ""}`} aria-pressed={prefs[d.k]} aria-label={d.label} title={d.label}
                        onClick={() => { const v = !prefs[d.k]; setPrefs(setFlow({ [d.k]: v } as Partial<FlowPrefs>)); buzz(8); if (d.k === "sound" && v) blip(880); }}>
                        <Icon name={d.icon} size={20} />
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
                    <Icon name="notifications" size={19} /><h2>Tulisan terbaru</h2>
                    <button className="sbar-btn" aria-label="Tutup" onClick={() => setPanel("none")}><Icon name="close" size={19} /></button>
                  </div>
                  {items.length === 0 && <p style={{ color: "var(--ink3)", fontSize: 13.5 }}>Belum ada tulisan.</p>}
                  {items.map((n) => (
                    <Link key={n.id} href={`/post/${n.id}`} className="notif" onClick={() => setPanel("none")}>
                      <span className="notif-ic"><Icon name="article" size={18} /></span>
                      <span className="notif-b"><b>{n.title}</b><p>{n.excerpt}</p></span>
                      <Icon name="chevron_right" size={18} />
                    </Link>
                  ))}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="dockm" aria-label="Navigasi bawah">
        <Link href="/" className={pathname === "/" ? "on" : ""} aria-current={pathname === "/" ? "page" : undefined}>
          <span className="di"><Icon name="home" size={20} fill={pathname === "/"} /></span><small>Beranda</small>
        </Link>
        <button onClick={openSearch} aria-label="Cari tulisan">
          <span className="di"><Icon name="search" size={20} /></span><small>Cari</small>
        </button>
        <Link href="/about" className={pathname.startsWith("/about") ? "on" : ""}>
          <span className="di"><Icon name="info" size={20} fill={pathname.startsWith("/about")} /></span><small>Tentang</small>
        </Link>
        <button onClick={() => { setPanel((p) => p === "cc" ? "none" : "cc"); buzz(6); blip(640); }} aria-label="Pusat kontrol">
          <span className="di"><Icon name="tune" size={20} /></span><small>Atur</small>
        </button>
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
