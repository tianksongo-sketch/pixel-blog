"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { PostWithStats } from "@/lib/db";
import { Icon } from "../ui";
import { FeedView } from "../FeedView";
import { BigClock, DateLine, GreetLine } from "./Clock";
import { useApp } from "../Providers";
import { buzz, blip } from "@/lib/flow";

type Stats = { posts: number; likes: number; comments: number; views: number; labels: number };

export function HomeScreen({ posts, stats, initialLabel }: {
  posts: PostWithStats[]; stats: Stats; initialLabel?: string;
}) {
  const { registerAdminTap } = useApp();
  const router = useRouter();

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
          <button className="hstat" style={{ cursor: "pointer", textAlign: "left" }} onClick={() => registerAdminTap("glance")}
            aria-label="Sekilas komentar">
            <b>{stats.comments}</b><span><Icon name="chat_bubble" size={12} />Komentar</span>
          </button>
        </motion.div>
      </section>

      <div className="quick">
        <button onClick={search}><Icon name="search" size={17} />Cari tulisan</button>
        <Link href="/about" prefetch><Icon name="info" size={17} />Tentang</Link>
        <Link href="/admin" prefetch><Icon name="edit_note" size={17} />Studio</Link>
        <Link href="/pengaturan" prefetch><Icon name="tune" size={17} />Pengaturan</Link>
        <a href="/feed.xml" target="_blank" rel="noopener"><Icon name="rss_feed" size={17} />RSS</a>
      </div>

      <FeedView posts={posts} initialLabel={initialLabel} />

      <div className="footer">© 2026 F4KUYY · FlowOS</div>
    </main>
  );
}
