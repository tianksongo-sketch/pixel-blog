"use client";
import { useState, type CSSProperties } from "react";
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
  const [loaded, setLoaded] = useState(false);
  const imgRef = useParallax<HTMLImageElement>(7);
  const href = `/post/${post.id}`;

  return (
    <motion.article
      className="card"
      initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, delay: Math.min(index * 0.045, 0.36) }}
      onPointerEnter={() => warm(router, href)}
    >
      <Link
        href={href} prefetch className="card-media" aria-label={post.title}
        onPointerDown={() => warm(router, href)}
        style={{ viewTransitionName: `post-img-${post.id}` } as CSSProperties}
      >
        {post.hasCover ? (
          <>
            {post.thumb && <span className="lqip" style={{ backgroundImage: `url("${post.thumb}")` }} aria-hidden="true" />}
            <img
              ref={imgRef} src={`/api/img/${post.id}?v=${post.ver}`} alt={post.title}
              loading={index < 3 ? "eager" : "lazy"} decoding="async"
              className={loaded ? "loaded" : ""} onLoad={() => setLoaded(true)}
            />
          </>
        ) : (
          <span className="cover-fallback">
            <span className="cover-mesh" aria-hidden="true" />
            <Icon name="article" size={30} />
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
