"use client";
import { useState, type CSSProperties, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import type { PostWithStats } from "@/lib/db";
import { hostOf } from "@/lib/utils";
import { navVT } from "@/lib/nav";
import { attachRipple, Icon, RollingNumber, useParallax } from "./ui";
import { LikeButton } from "./LikeButton";
import { ShareButton } from "./ShareButton";

export function PostCard({ post, index }: { post: PostWithStats; index: number }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const imgRef = useParallax<HTMLImageElement>(8);
  const href = `/post/${post.id}`;
  const go = (e: MouseEvent) => { e.preventDefault(); navVT(router, href); };

  return (
    <motion.article
      className="card"
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30, delay: Math.min(index * 0.06, 0.5) }}
    >
      <Link
        href={href} className="card-media" onClick={go} aria-label={post.title}
        style={{ viewTransitionName: `post-img-${post.id}` } as CSSProperties}
      >
        <img
          ref={imgRef} src={`/api/img/${post.id}?v=${post.ver}`} alt={post.title} loading="lazy"
          className={loaded ? "loaded" : ""} onLoad={() => setLoaded(true)}
        />
      </Link>
      <div className="card-body">
        <h2 className="card-title"><Link href={href} onClick={go}>{post.title}</Link></h2>
        <a className="link card-link" href={post.link} target="_blank" rel="noopener noreferrer nofollow">
          <Icon name="link" size={16} />
          {hostOf(post.link)}
          <Icon name="open_in_new" size={14} />
        </a>
        <div className="card-actions">
          <LikeButton postId={post.id} count={post.likes} liked={post.liked} />
          <button
            className="btn b-text act" onPointerDown={attachRipple}
            onClick={() => navVT(router, `${href}#comments`)} aria-label={`${post.comments} komentar`}
          >
            <Icon name="chat_bubble" size={21} />
            <RollingNumber value={post.comments} />
          </button>
          <span className="act-spacer" />
          <ShareButton post={post} />
        </div>
      </div>
    </motion.article>
  );
}
