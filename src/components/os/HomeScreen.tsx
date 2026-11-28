"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { PostWithStats } from "@/lib/db";
import { Icon } from "../ui";
import { useApp } from "../Providers";
import { buzz, blip } from "@/lib/flow";

type Stats = { posts: number; likes: number; comments: number; views: number; labels: number };

const APPS = [
  { href: "/tulisan", label: "Tulisan", icon: "article", g: "linear-gradient(145deg,#7A3CFF,#E8437F)" },
  { href: "/about", label: "Tentang", icon: "info", g: "linear-gradient(145deg,#0FB5C9,#4DA3FF)" },
  { href: "/admin", label: "Studio", icon: "edit_note", g: "linear-gradient(145deg,#FFB020,#FF6A3D)" },
  { href: "/pengaturan", label: "Pengaturan", icon: "tune", g: "linear-gradient(145deg,#5A5A72,#9A9AB4)" },
  { href: "/feed.xml", label: "RSS", icon: "rss_feed", g: "linear-gradient(145deg,#FF6A3D,#E8437F)", ext: true },
  { href: "/tulisan", label: "Cari", icon: "search", g: "linear-gradient(145deg,#3DDC84,#0FB5C9)", search: true }
];

const DOCK = [
  { href: "/", label: "Beranda", icon: "home", g: "linear-gradient(145deg,#7A3CFF,#4DA3FF)" },
  { href: "/tulisan", label: "Tulisan", icon: "article", g: "linear-gradient(145deg,#E8437F,#FF6A3D)" },
  { href: "/about", label: "Tentang", icon: "info", g: "linear-gradient(145deg,#0FB5C9,#3DDC84)" },
  { href: "/pengaturan", label: "Atur", icon: "tune", g: "linear-gradient(145deg,#FFB020,#FF6A3D)" }
];

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function HomeScreen({ posts, stats }: { posts: PostWithStats[]; stats: Stats }) {
  const now = useClock();
  const router = useRouter();
  const { registerAdminTap } = useApp();
  const recent = posts.slice(0, 4);
  const latest = posts[0] ?? null;

  const hh = now ? String(now.getHours()).padStart(2, "0") : "--";
  const mm = now ? String(now.getMinutes()).padStart(2, "0") : "--";
  const date = now ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) : "\u00A0";
  const greet = now
    ? (now.getHours() < 5 ? "Selamat malam" : now.getHours() < 11 ? "Selamat pagi" : now.getHours() < 15 ? "Selamat siang" : now.getHours() < 19 ? "Selamat sore" : "Selamat malam")
    : "";

  const openSearch = () => {
    buzz(8); blip(700);
    router.push("/tulisan");
    setTimeout(() => window.dispatchEvent(new Event("px:focus-search")), 620);
  };

  return (
    <main className="container page home">
      <motion.div className="clockwrap" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}>
        <div className="clock-date" suppressHydrationWarning>{date}</div>
        <button className="clock" onClick={() => registerAdminTap("brand")} aria-label="Jam" tabIndex={-1}
          suppressHydrationWarning>{hh}:{mm}</button>
        <div className="clock-sub" suppressHydrationWarning>{greet}</div>
      </motion.div>

      <motion.div className="wgrid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 28, delay: .08 }}>
        <section className="widget gl gl-rim">
          <div className="widget-h">
            <Icon name="insights" size={16} />
            <b><button onClick={() => registerAdminTap("glance")} aria-label="Sekilas">Sekilas</button></b>
            <span style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink3)" }}>{stats.labels} label</span>
          </div>
          <div className="wstats">
            <div className="wstat"><b>{stats.posts}</b><span><Icon name="article" size={12} />Tulisan</span></div>
            <div className="wstat"><b>{stats.views}</b><span><Icon name="visibility" size={12} />Pembaca</span></div>
            <div className="wstat"><b>{stats.likes}</b><span><Icon name="favorite" size={12} />Suka</span></div>
            <div className="wstat"><b>{stats.comments}</b><span><Icon name="chat_bubble" size={12} />Komentar</span></div>
          </div>
        </section>

        <section className="widget gl gl-rim">
          <div className="widget-h"><Icon name="auto_stories" size={16} /><b>Lanjutkan</b></div>
          {latest ? (
            <Link className="wjump" href={`/post/${latest.id}`}>
              {latest.hasCover
                ? <img src={`/api/img/${latest.id}?v=${latest.ver}`} alt="" />
                : <span className="ph"><Icon name="article" size={22} /></span>}
              <span style={{ minWidth: 0 }}>
                <b>{latest.title}</b>
                <span>{latest.readMin} mnt baca</span>
              </span>
            </Link>
          ) : <p style={{ color: "var(--ink3)", fontSize: 13 }}>Belum ada tulisan.</p>}
        </section>
      </motion.div>

      <motion.div className="apps" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 28, delay: .14 }}>
        {APPS.map((a) => a.search ? (
          <button key={a.label} className="app" onClick={openSearch}>
            <span className="app-ic" style={{ background: a.g }}><Icon name={a.icon} size={27} /></span>
            <span>{a.label}</span>
          </button>
        ) : a.ext ? (
          <a key={a.label} className="app" href={a.href} target="_blank" rel="noopener">
            <span className="app-ic" style={{ background: a.g }}><Icon name={a.icon} size={27} /></span>
            <span>{a.label}</span>
          </a>
        ) : (
          <Link key={a.label} className="app" href={a.href} prefetch>
            <span className="app-ic" style={{ background: a.g }}><Icon name={a.icon} size={27} /></span>
            <span>{a.label}</span>
          </Link>
        ))}
      </motion.div>

      <div className="sec-h"><h2>Terbaru</h2><span className="n">{posts.length}</span></div>
      <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 28, delay: .2 }}>
        {recent.map((p) => (
          <Link key={p.id} href={`/post/${p.id}`} prefetch className="notif">
            <span className="notif-ic"><Icon name="article" size={19} /></span>
            <span className="notif-b">
              <b>{p.title}</b>
              <p>{p.excerpt}</p>
            </span>
            <span className="notif-t">{p.readMin}m</span>
          </Link>
        ))}
        {recent.length === 0 && <p style={{ color: "var(--ink3)", fontSize: 13.5, padding: "10px 2px" }}>Belum ada tulisan. Buka Studio untuk menulis.</p>}
      </motion.div>

      <div className="dock gl gl-rim" style={{ marginTop: 18 }}>
        {DOCK.map((d) => (
          <Link key={d.label} className="app" href={d.href} prefetch>
            <span className="app-ic" style={{ background: d.g, width: 52, height: 52, borderRadius: 17 }}>
              <Icon name={d.icon} size={24} />
            </span>
            <span>{d.label}</span>
          </Link>
        ))}
      </div>

      <div className="footer">© 2026 F4KUYY · FlowOS</div>
    </main>
  );
}
