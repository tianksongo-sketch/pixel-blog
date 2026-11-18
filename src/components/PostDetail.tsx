"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Comment, PostCard, PostFull } from "@/lib/db";
import { formatDate, hostOf } from "@/lib/utils";
import { warm } from "@/lib/nav";
import { attachRipple, Avatar, Icon, LabelChip, RollingNumber, useParallax } from "./ui";
import { LikeButton } from "./LikeButton";
import { ShareRow } from "./ShareButton";
import { Comments } from "./Comments";

type Props = {
  post: PostFull;
  stats: { likes: number; comments: number; liked: boolean };
  comments: Comment[];
  newer: PostCard | null;
  older: PostCard | null;
};

export function PostDetail({ post, stats, comments, newer, older }: Props) {
  const router = useRouter();
  const imgRef = useParallax<HTMLImageElement>(10);
  const barRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      setShowTop(window.scrollY > 700);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    warm(router, newer ? `/post/${newer.id}` : "/");
    if (older) warm(router, `/post/${older.id}`);
  }, [router, newer, older]);

  return (
    <>
      <div className="read-progress" aria-hidden="true"><div ref={barRef} /></div>
      <motion.main
        className="container page article"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.05, 0.7, 0.1, 1] }}
      >
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/" prefetch>Beranda</Link>
          <Icon name="chevron_right" size={16} />
          <span>{post.title}</span>
        </nav>

        {post.labels.length > 0 && (
          <div className="article-labels">
            {post.labels.map((l) => <LabelChip key={l} label={l} onClick={() => router.push(`/?label=${encodeURIComponent(l)}`)} />)}
          </div>
        )}

        <h1 className="article-title">{post.title}</h1>

        <div className="article-meta">
          <Avatar name={post.author} size={38} />
          <span className="article-author">{post.author}</span>
          <span className="dot" />
          <span suppressHydrationWarning>{formatDate(post.createdAt)}</span>
          <span className="dot" />
          <span>{post.readMin} mnt baca</span>
          {post.status === "draft" && <span className="badge-draft"><Icon name="draft" size={14} />Draf</span>}
        </div>

        {post.hasCover && (
          <figure className="article-hero" style={{ viewTransitionName: `post-img-${post.id}` } as CSSProperties}>
            {post.thumb && <span className="lqip" style={{ backgroundImage: `url("${post.thumb}")` }} aria-hidden="true" />}
            <img
              ref={imgRef} src={`/api/img/${post.id}?v=${post.ver}`} alt={post.title}
              decoding="async" fetchPriority="high"
              className={coverLoaded ? "loaded" : ""} onLoad={() => setCoverLoaded(true)}
            />
          </figure>
        )}

        {post.link && (
          <a className="link article-link" href={post.link} target="_blank" rel="noopener noreferrer nofollow">
            <Icon name="link" size={18} />{hostOf(post.link)}<Icon name="open_in_new" size={15} />
          </a>
        )}

        <div className="article-body" dangerouslySetInnerHTML={{ __html: post.body }} />

        <ShareRow post={post} />

        <div className="detail-actions">
          <LikeButton postId={post.id} count={stats.likes} liked={stats.liked} />
          <button
            className="btn b-text act" onPointerDown={attachRipple}
            onClick={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <Icon name="chat_bubble" size={21} />
            <RollingNumber value={stats.comments} />
          </button>
        </div>

        <nav className="post-nav" aria-label="Navigasi postingan">
          {newer ? (
            <Link href={`/post/${newer.id}`} prefetch className="post-nav-card" onPointerDown={() => warm(router, `/post/${newer.id}`)}>
              <span className="post-nav-dir"><Icon name="arrow_back" size={16} />Lebih baru</span>
              <span className="post-nav-title">{newer.title}</span>
            </Link>
          ) : <span className="post-nav-card ghost" />}
          {older ? (
            <Link href={`/post/${older.id}`} prefetch className="post-nav-card right" onPointerDown={() => warm(router, `/post/${older.id}`)}>
              <span className="post-nav-dir">Lebih lama<Icon name="arrow_forward" size={16} /></span>
              <span className="post-nav-title">{older.title}</span>
            </Link>
          ) : <span className="post-nav-card ghost" />}
        </nav>

        <Comments postId={post.id} initial={comments} />
      </motion.main>

      <AnimatePresence>
        {showTop && (
          <motion.button
            className="fab fab-top" aria-label="Kembali ke atas"
            onPointerDown={attachRipple}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 30 }}
          >
            <Icon name="arrow_upward" size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
