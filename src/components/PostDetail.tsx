"use client";
import type { CSSProperties } from "react";
import { motion } from "motion/react";
import type { Comment, PostWithStats } from "@/lib/db";
import { hostOf } from "@/lib/utils";
import { attachRipple, Icon, RollingNumber, useParallax } from "./ui";
import { LikeButton } from "./LikeButton";
import { ShareButton } from "./ShareButton";
import { Comments } from "./Comments";

export function PostDetail({ post, comments }: { post: PostWithStats; comments: Comment[] }) {
  const imgRef = useParallax<HTMLImageElement>(12);
  return (
    <motion.main
      className="container page"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.05, 0.7, 0.1, 1] }}
    >
      <div className="detail-media" style={{ viewTransitionName: `post-img-${post.id}` } as CSSProperties}>
        <img ref={imgRef} src={`/api/img/${post.id}?v=${post.ver}`} alt={post.title} />
      </div>
      <h1 className="detail-title">{post.title}</h1>
      <a className="link detail-link" href={post.link} target="_blank" rel="noopener noreferrer nofollow">
        <Icon name="link" size={18} />
        {hostOf(post.link)}
        <Icon name="open_in_new" size={15} />
      </a>
      <div className="detail-actions">
        <LikeButton postId={post.id} count={post.likes} liked={post.liked} />
        <button
          className="btn b-text act" onPointerDown={attachRipple}
          onClick={() => document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          aria-label="Lihat komentar"
        >
          <Icon name="chat_bubble" size={21} />
          <RollingNumber value={post.comments} />
        </button>
        <span className="act-spacer" />
        <ShareButton post={post} labeled />
      </div>
      <Comments postId={post.id} initial={comments} />
    </motion.main>
  );
}
