"use client";
import Link from "next/link";
import { motion } from "motion/react";
import type { PostWithStats } from "@/lib/db";
import { Icon } from "../ui";
import { FeedView } from "../FeedView";
import { BigClock, DateLine, GreetLine } from "./Clock";
import { useApp } from "../Providers";
import { buzz, blip } from "@/lib/flow";

type Stats = { posts: number; likes: number; comments: number; views: number; labels: number };

const APPS = [
  { href: "/about", label: "Tentang", icon: "info", g: "linear-gradient(145deg,#0FB5C9,#4DA3FF)" },
  { href: "/admin", label: "Studio", icon: "edit_note", g: "linear-gradient(145deg,#FFB020,#FF6A3D)" },
  { href: "/feed.xml", label: "RSS", icon: "rss_feed", g: "linear-gradient(145deg,#FF6A3D,#E8437F)", ext: true },
  { href: "/sitemap.xml", label: "Peta", icon: "map", g: "linear-gradient(145deg,#3DDC84,#0FB5C9)", ext: true }
];

export function HomeScreen({ posts, stats, initialLabel }: {
  posts: PostWithStats[]; stats: Stats; initialLabel?: string;
}) {
  const { registerAdminTap } = useApp();
  const recent = posts.slice(0, 4);
  const latest = posts[0] ?? null;

  const search = () => {
    buzz(8); blip(700);
    window.dispatchEvent(new Event("px:focus-search"));
  };

  return (
    <main className="container page">
      <section className="hero">
        <motion.div className="hero-clock" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}>
          <DateLine className="hero-date" />
          <BigClock onTap={() => registerAdminTap("brand")} />
          <GreetLine className="hero-sub" />
        </motion.div>

        <motion.div className="hstats" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30, delay: .06 }}>
          <div className="hstat"><b>{stats.posts}</b><span><Icon name="article" size={12} />Tulisan</span></div>
          <div className="hstat"><b>{stats.views}</b><span><Icon name="visibility" size={12} />Pembaca</span></div>
          <div className="hstat"><b>{stats.likes}</b><span><Icon name="favorite" size={12} />Suka</span></div>
          <button className="hstat" style={{ cursor: "pointer" }} onClick={() => registerAdminTap("glance")} aria-label="Sekilas komentar">
            <b>{stats.comments}</b><span><Icon name="chat_bubble" size={12} />Komentar</span>
          </button>
        </motion.div>
      </section>

      <motion.div className="apps" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: .1 }}>
        <button className="app" onClick={search}>
          <span className="app-ic" style={{ background: "linear-gradient(145deg,#7A3CFF,#E8437F)" }}><Icon name="search" size={26} /></span>
          <span>Cari</span>
        </button>
        {APPS.map((a) => a.ext ? (
          <a key={a.label} className="app" href={a.href} target="_blank" rel="noopener">
            <span className="app-ic" style={{ background: a.g }}><Icon name={a.icon} size={26} /></span>
            <span>{a.label}</span>
          </a>
        ) : (
          <Link key={a.label} className="app" href={a.href} prefetch>
            <span className="app-ic" style={{ background: a.g }}><Icon name={a.icon} size={26} /></span>
            <span>{a.label}</span>
          </Link>
        ))}
      </motion.div>

      <div className="section-head"><h2>Terbaru</h2><span className="count">{posts.length}</span></div>
      {recent.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28, delay: .14 }} style={{ marginBottom: 20 }}>
          {recent.map((p) => (
            <Link key={p.id} href={`/post/${p.id}`} prefetch className="notif">
              <span className="notif-ic"><Icon name="article" size={19} /></span>
              <span className="notif-b"><b>{p.title}</b><p>{p.excerpt}</p></span>
              <span className="notif-t">{p.readMin}m<Icon name="expand_more" size={16} /></span>
            </Link>
          ))}
        </motion.div>
      )}

      {latest && (
        <section className="widget" style={{ marginBottom: 20 }}>
          <div className="widget-h"><Icon name="auto_stories" size={16} /><b>Lanjutkan membaca</b></div>
          <Link className="notif" style={{ margin: 0 }} href={`/post/${latest.id}`} prefetch>
            {latest.hasCover
              ? <img src={`/api/img/${latest.id}?v=${latest.ver}`} alt="" style={{ width: 44, height: 44, borderRadius: 13, objectFit: "cover", flex: "none" }} />
              : <span className="notif-ic"><Icon name="image" size={19} /></span>}
            <span className="notif-b"><b>{latest.title}</b><p>{latest.readMin} mnt baca · {latest.likes} suka</p></span>
            <Icon name="chevron_right" size={18} />
          </Link>
        </section>
      )}

      <FeedView posts={posts} initialLabel={initialLabel} />

      <div className="footer">© 2026 F4KUYY · FlowOS</div>
    </main>
  );
}
