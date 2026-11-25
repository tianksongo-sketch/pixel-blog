"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Comment, PostCard, PostFull } from "@/lib/db";
import { formatDate, hostOf, softenHtml } from "@/lib/utils";
import { warm } from "@/lib/nav";
import { attachRipple, Avatar, Icon, LabelChip, RollingNumber, useParallax } from "./ui";
import { LikeButton } from "./LikeButton";
import { ShareRow } from "./ShareButton";
import { Comments } from "./Comments";
import { Toc } from "./Toc";

type Props = {
  post: PostFull;
  stats: { likes: number; comments: number; liked: boolean };
  comments: Comment[];
  newer: PostCard | null;
  older: PostCard | null;
  views: number;
};

const ANCHOR_CSS = `
#comments{scroll-margin-top:calc(104px + var(--safe-t));}
.article-body h2,.article-body h3,.article-body h4{scroll-margin-top:calc(104px + var(--safe-t));}
`;

export function PostDetail({ post, stats, comments, newer, older, views }: Props) {
  const router = useRouter();
  const parallax = useParallax<HTMLImageElement>(10);
  const barRef = useRef<HTMLDivElement>(null);
  const counted = useRef(false);
  const [showTop, setShowTop] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reads, setReads] = useState(views);
  const emptyBody = !post.body || !post.body.replace(/<[^>]*>/g, "").trim();
  const showPhoto = post.hasCover && !failed;
  const bodyHtml = useMemo(() => softenHtml(post.body || ""), [post.body]);

  const attachImg = useCallback((el: HTMLImageElement | null) => {
    parallax.current = el;
    if (el && el.complete && el.naturalWidth > 0) setReady(true);
  }, [parallax]);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    const t = setTimeout(() => {
      void fetch("/api/view", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id })
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (j && typeof j.views === "number") setReads(j.views); })
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [post.id]);

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
      <style dangerouslySetInnerHTML={{ __html: ANCHOR_CSS }} />
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
          {reads > 0 && (
            <>
              <span className="dot" />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="visibility" size={16} />
                <RollingNumber value={reads} /> pembaca
              </span>
            </>
          )}
          {post.status === "draft" && <span className="badge-draft"><Icon name="draft" size={14} />Draf</span>}
        </div>

        {post.hasCover && (
          <figure className={`article-hero${ready ? " ready" : ""}`} style={{ viewTransitionName: `post-img-${post.id}` } as CSSProperties}>
            {showPhoto ? (
              <>
                {post.thumb && <span className={`lqip${ready ? " gone" : ""}`} style={{ backgroundImage: `url("${post.thumb}")` }} aria-hidden="true" />}
                <img
                  ref={attachImg} src={`/api/img/${post.id}?v=${post.ver}`} alt={post.title}
                  decoding="async" fetchPriority="high"
                  onLoad={() => setReady(true)} onError={() => { setFailed(true); setReady(true); }}
                />
              </>
            ) : (
              <span className="cover-fallback">
                <span className="cover-mesh" aria-hidden="true" />
                <Icon name="broken_image" size={34} />
                <span className="cover-word">Foto tidak tersedia</span>
              </span>
            )}
          </figure>
        )}

        {post.link && (
          <a className="link article-link" href={post.link} target="_blank" rel="noopener noreferrer nofollow">
            <Icon name="link" size={18} />{hostOf(post.link)}<Icon name="open_in_new" size={15} />
          </a>
        )}

        {emptyBody ? (
          <div className="article-empty">
            <Icon name="article" size={24} />
            <p>Artikel ini tidak memiliki isi.</p>
          </div>
        ) : (
          <>
            <Toc postId={post.id} />
            <div className="article-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </>
        )}

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
