"use client";
import { useCallback, useState } from "react";
import type { PostCard } from "@/lib/db";
import { attachRipple, Btn, Icon, Sheet } from "./ui";
import { useApp } from "./Providers";

function useShare(post: PostCard) {
  const { snack } = useApp();
  const [open, setOpen] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : `/post/${post.id}`;

  const copy = useCallback(async () => {
    setOpen(false);
    snack("Link disalin");
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* abaikan */ }
      ta.remove();
    }
  }, [url, snack]);

  const native = useCallback(() => {
    setOpen(false);
    if (navigator.share) void navigator.share({ title: post.title, url }).catch(() => {});
    else void copy();
  }, [post.title, url, copy]);

  const enc = encodeURIComponent(url);
  const text = encodeURIComponent(post.title);
  const targets = [
    { label: "WhatsApp", icon: "chat", href: `https://wa.me/?text=${text}%20${enc}` },
    { label: "Telegram", icon: "send", href: `https://t.me/share/url?url=${enc}&text=${text}` },
    { label: "X", icon: "tag", href: `https://twitter.com/intent/tweet?url=${enc}&text=${text}` },
    { label: "Facebook", icon: "thumb_up", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { label: "Email", icon: "mail", href: `mailto:?subject=${text}&body=${enc}` }
  ];

  const sheet = (
    <Sheet open={open} onClose={() => setOpen(false)} title="Bagikan">
      <div className="share-list">
        <button className="share-item" onPointerDown={attachRipple} onClick={() => void copy()}>
          <span className="share-ic"><Icon name="link" size={22} /></span>Salin link
        </button>
        {typeof navigator !== "undefined" && !!navigator.share && (
          <button className="share-item" onPointerDown={attachRipple} onClick={native}>
            <span className="share-ic"><Icon name="ios_share" size={22} /></span>Bagikan via aplikasi
          </button>
        )}
        {targets.map((t) => (
          <a key={t.label} className="share-item" href={t.href}
            target={t.href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer nofollow"
            onPointerDown={attachRipple} onClick={() => setOpen(false)}>
            <span className="share-ic"><Icon name={t.icon} size={22} /></span>{t.label}
          </a>
        ))}
      </div>
    </Sheet>
  );

  return { open, setOpen, copy, native, targets, sheet, url };
}

export function ShareButton({ post, labeled = false }: { post: PostCard; labeled?: boolean }) {
  const s = useShare(post);
  return (
    <>
      <button
        className={labeled ? "btn b-tonal" : "btn b-icon act"}
        onPointerDown={attachRipple} onClick={() => s.setOpen(true)} aria-label="Bagikan"
      >
        <Icon name="share" size={21} />
        {labeled && "Bagikan"}
      </button>
      {s.sheet}
    </>
  );
}

export function ShareRow({ post }: { post: PostCard }) {
  const s = useShare(post);
  const quick = s.targets.slice(0, 3);
  return (
    <div className="share-row">
      <span className="share-row-label">Bagikan</span>
      <div className="share-row-pills">
        <button className="share-pill" onPointerDown={attachRipple} onClick={() => void s.copy()}>
          <Icon name="link" size={18} />Salin tautan
        </button>
        {quick.map((t) => (
          <a key={t.label} className="share-pill" href={t.href} target="_blank" rel="noopener noreferrer nofollow" onPointerDown={attachRipple}>
            <Icon name={t.icon} size={18} />{t.label}
          </a>
        ))}
        <button className="share-pill" onPointerDown={attachRipple} onClick={() => s.setOpen(true)}>
          <Icon name="more_horiz" size={18} />Bagikan…
        </button>
      </div>
      {s.sheet}
    </div>
  );
}
