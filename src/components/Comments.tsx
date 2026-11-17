"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Comment } from "@/lib/db";
import { commentHtml, timeAgo } from "@/lib/utils";
import { attachRipple, Avatar, Btn, Dialog, Icon } from "./ui";
import { useApp } from "./Providers";

export function Comments({ postId, initial }: { postId: string; initial: Comment[] }) {
  const { name, saveName, requireConsent, snack } = useApp();
  const [list, setList] = useState<Comment[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const pendingRef = useRef("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/comments?post=${encodeURIComponent(postId)}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j.comments)) setList(j.comments);
    } catch { /* offline, biarkan */ }
  }, [postId]);

  /* Auto-refresh 20 detik hanya saat tab aktif */
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") void refresh(); };
    const id = setInterval(tick, 20000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [refresh]);

  useEffect(() => {
    if (window.location.hash === "#comments") {
      document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const send = useCallback(async (t: string) => {
    setSending(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: postId, text: t })
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setText("");
        if (taRef.current) taRef.current.style.height = "auto";
        await refresh();
        return;
      }
      if (j.needConsent) { requireConsent(() => { void send(t); }); return; }
      if (j.needName) { pendingRef.current = t; setNameOpen(true); return; }
      snack(j.error || "Gagal mengirim komentar");
    } catch {
      snack("Gagal terhubung, coba lagi");
    } finally {
      setSending(false);
    }
  }, [postId, refresh, requireConsent, snack]);

  const submit = () => {
    const t = text.trim();
    if (!t || sending) return;
    if (!name) { pendingRef.current = t; setNameOpen(true); return; }
    void send(t);
  };

  const onNameSave = async (n: string) => {
    const st = await saveName(n);
    if (st === "consent") {
      requireConsent(() => {
        void (async () => {
          const s2 = await saveName(n);
          if (s2 === "ok") {
            setNameOpen(false);
            const t = pendingRef.current;
            pendingRef.current = "";
            if (t) void send(t);
          } else snack("Gagal menyimpan nama");
        })();
      });
      return;
    }
    if (st === "ok") {
      setNameOpen(false);
      const t = pendingRef.current;
      pendingRef.current = "";
      if (t) void send(t);
      else snack(`Hai, ${n}!`);
    } else snack("Gagal menyimpan nama, coba lagi");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };
  const onInput = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const shown = [...list].reverse();

  return (
    <section className="cm-section" id="comments">
      <div className="cm-head">
        <h2>Komentar ({list.length})</h2>
        {name && (
          <button
            className="chip" onPointerDown={attachRipple}
            onClick={() => { pendingRef.current = ""; setNameOpen(true); }}
            aria-label={`Ganti nama, saat ini ${name}`}
          >
            <Icon name="person" size={16} />
            Ganti nama
          </button>
        )}
      </div>
      <div>
        <div className="cm-input">
          <textarea
            ref={taRef} rows={1} maxLength={500} value={text}
            placeholder={name ? `Komentar sebagai ${name}…` : "Tulis komentar…"}
            onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} onInput={onInput}
            aria-label="Tulis komentar"
          />
          <button
            className="btn cm-send" onPointerDown={attachRipple} onClick={submit}
            disabled={!text.trim() || sending} aria-label="Kirim komentar"
          >
            <Icon name="send" size={20} fill />
          </button>
        </div>
        <div className="cm-count">{text.length}/500 · Enter kirim, Shift+Enter baris baru</div>
      </div>
      {shown.length === 0 && <p className="cm-empty">Belum ada komentar. Jadi yang pertama, dong.</p>}
      <AnimatePresence initial={false}>
        {shown.map((c) => (
          <motion.div
            key={c.id} className="cm-item" layout
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 480, damping: 34 }}
          >
            <Avatar name={c.name} size={40} />
            <div className="cm-bubble">
              <div className="cm-meta">
                <span className="cm-name">{c.name}</span>
                <span className="cm-time" suppressHydrationWarning>{timeAgo(c.ts)}</span>
              </div>
              <p className="cm-text" dangerouslySetInnerHTML={{ __html: commentHtml(c.text) }} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <NameDialog
        open={nameOpen} current={name}
        onClose={() => { setNameOpen(false); pendingRef.current = ""; }}
        onSave={onNameSave}
      />
    </section>
  );
}

function NameDialog({ open, current, onClose, onSave }: {
  open: boolean; current: string | null; onClose: () => void; onSave: (n: string) => Promise<void>;
}) {
  const [val, setVal] = useState(current ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setVal(current ?? ""); setErr(""); } }, [open, current]);

  const save = async () => {
    const n = val.trim();
    if (n.length < 2 || n.length > 24) { setErr("Nama harus 2–24 karakter."); return; }
    setBusy(true);
    await onSave(n);
    setBusy(false);
  };

  return (
    <Dialog
      open={open} onClose={onClose} icon="waving_hand" title="Siapa namamu?"
      text="Nama ini tampil di komentarmu (2–24 karakter)."
      actions={<>
        <Btn variant="text" onClick={onClose} disabled={busy}>Batal</Btn>
        <Btn variant="filled" onClick={() => void save()} disabled={busy}>Simpan</Btn>
      </>}
    >
      <div className="field" style={{ marginBottom: 0 }}>
        <input
          className={`input${err ? " err" : ""}`} value={val} maxLength={24} autoFocus
          placeholder="Nama kamu" aria-label="Nama"
          onChange={(e) => { setVal(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }}
        />
        {err && <span className="field-err">{err}</span>}
      </div>
    </Dialog>
  );
}
