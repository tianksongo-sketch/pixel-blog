"use client";
import { useState } from "react";
import type { Post } from "@/lib/db";
import { attachRipple, Icon, Sheet } from "./ui";
import { useApp } from "./Providers";

export function ShareButton({ post, labeled = false }: { post: Post; labeled?: boolean }) {
  const { snack } = useApp();
  const [open, setOpen] = useState(false);
  const url = () => `${window.location.origin}/post/${post.id}`;

  const doShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: post.title, url: url() }); } catch { /* batal */ }
      return;
    }
    setOpen(true);
  };

  const copy = async () => {
    const u = url();
    try {
      await navigator.clipboard.writeText(u);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = u;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setOpen(false);
    snack("Link disalin");
  };

  const u = open && typeof window !== "undefined" ? url() : "";
  const enc = encodeURIComponent(u);
  const text = encodeURIComponent(post.title);
  const items = [
    { label: "WhatsApp", icon: "chat", href: `https://wa.me/?text=${text}%20${enc}` },
    { label: "Telegram", icon: "send", href: `https://t.me/share/url?url=${enc}&text=${text}` },
    { label: "X", icon: "tag", href: `https://twitter.com/intent/tweet?url=${enc}&text=${text}` },
    { label: "Facebook", icon: "thumb_up", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { label: "Email", icon: "mail", href: `mailto:?subject=${text}&body=${enc}` }
  ];

  return (
    <>
      <button
        className={labeled ? "btn b-tonal" : "btn b-icon act"}
        onPointerDown={attachRipple} onClick={() => void doShare()} aria-label="Bagikan"
      >
        <Icon name="share" size={21} />
        {labeled && "Bagikan"}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Bagikan">
        <div className="share-list">
          <button className="share-item" onPointerDown={attachRipple} onClick={() => void copy()}>
            <span className="share-ic"><Icon name="link" size={22} /></span>
            Salin link
          </button>
          {items.map((it) => (
            <a
              key={it.label} className="share-item" href={it.href}
              target={it.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noopener noreferrer nofollow"
              onPointerDown={attachRipple} onClick={() => setOpen(false)}
            >
              <span className="share-ic"><Icon name={it.icon} size={22} /></span>
              {it.label}
            </a>
          ))}
        </div>
      </Sheet>
    </>
  );
}
