"use client";
import { useCallback, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { PostWithStats } from "@/lib/db";
import { formatDate, hostOf } from "@/lib/utils";
import { warm } from "@/lib/nav";
import { attachRipple, Icon, RollingNumber, useParallax } from "./ui";
import { LikeButton } from "./LikeButton";
import { ShareButton } from "./ShareButton";

export function PostCard({ post, index, onLabel }: { post: PostWithStats; index: number; onLabel?: (l: string) => void }) {
  const router = useRouter();
  const parallax = useParallax<HTMLImageElement>(7);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const href = `/post/${post.id}`;
  const showPhoto = post.hasCover && !failed;

  /* Foto yang sudah selesai dimuat sebelum hidrasi tidak memicu onLoad.
     Callback ref ini memeriksa .complete supaya placeholder blur selalu dilepas. */
  const attachImg = useCallback((el: HTMLImageElement | null) => {
    parallax.current = el;
    if (el && el.complete && el.naturalWidth > 0) setReady(true);
  }, [parallax]);

  return (
    <motion.article
      className="card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, delay: Math.min(index * 0.04, 0.3) }}
      onPointerEnter={() => warm(router, href)}
    >
      <Link
        href={href} prefetch className={`card-media${ready || !showPhoto ? " ready" : ""}`}
        aria-label={post.title} onPointerDown={() => warm(router, href)}
        style={{ viewTransitionName: `post-img-${post.id}` } as CSSProperties}
      >
        {showPhoto ? (
          <>
            {post.thumb && <span className={`lqip${ready ? " gone" : ""}`} style={{ backgroundImage: `url("${post.thumb}")` }} aria-hidden="true" />}
            <img
              ref={attachImg}
              src={`/api/img/${post.id}?v=${post.ver}`}
              alt={post.title}
              loading={index < 3 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index === 0 ? "high" : "auto"}
              onLoad={() => setReady(true)}
              onError={() => { setFailed(true); setReady(true); }}
            />
          </>
        ) : (
          <span className="cover-fallback">
            <span className="cover-mesh" aria-hidden="true" />
            <Icon name={failed ? "broken_image" : "article"} size={30} />
            <span className="cover-word">{post.labels[0] ?? post.title.split(" ")[0]}</span>
          </span>
        )}
      </Link>
      <div className="card-body">
        {post.labels.length > 0 && (
          <div className="card-labels">
            {post.labels.slice(0, 3).map((l) => (
              <button key={l} className="label-chip small" onPointerDown={attachRipple} onClick={() => onLabel?.(l)}>{l}</button>
            ))}
          </div>
        )}
        <h2 className="card-title">
          <Link href={href} prefetch onPointerDown={() => warm(router, href)}>{post.title}</Link>
        </h2>
        {post.excerpt && <p className="card-excerpt">{post.excerpt}</p>}
        <div className="card-meta">
          <span suppressHydrationWarning>{formatDate(post.createdAt)}</span>
          <span className="dot" />
          <span>{post.readMin} mnt baca</span>
          {post.link && (
            <>
              <span className="dot" />
              <a className="link card-link" href={post.link} target="_blank" rel="noopener noreferrer nofollow" onClick={(e) => e.stopPropagation()}>
                <Icon name="link" size={14} />{hostOf(post.link)}
              </a>
            </>
          )}
        </div>
        <div className="card-actions">
          <LikeButton postId={post.id} count={post.likes} liked={post.liked} />
          <Link href={`${href}#comments`} prefetch className="btn b-text act" onPointerDown={attachRipple} aria-label={`${post.comments} komentar`}>
            <Icon name="chat_bubble" size={21} />
            <RollingNumber value={post.comments} />
          </Link>
          <span className="act-spacer" />
          <ShareButton post={post} />
        </div>
      </div>
    </motion.article>
  );
}
