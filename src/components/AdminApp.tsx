"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Comment, Post } from "@/lib/db";
import { compressImage, type Compressed } from "@/lib/img";
import { commentHtml, hostOf, normalizeLink } from "@/lib/utils";
import { attachRipple, Avatar, Btn, Dialog, Icon, Sheet, Skel, SPRING_SOFT } from "./ui";
import { useApp } from "./Providers";

type AdminPost = Post & { likes: number; comments: number; commentsList: Comment[] };
type Sess = { demo: boolean; needsSetup: boolean; authed: boolean };

async function aj(url: string, method = "GET", body?: unknown) {
  const r = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

export function AdminApp() {
  const { snack } = useApp();
  const [sess, setSess] = useState<Sess | null>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdminPost | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await aj("/api/admin/auth");
    if (!s.ok) { snack("Gagal memuat status admin"); return; }
    setSess(s.j as Sess);
    if (s.j.authed) {
      setLoadingPosts(true);
      const p = await aj("/api/admin/posts");
      if (p.ok) setPosts(p.j.posts || []);
      setLoadingPosts(false);
    }
  }, [snack]);

  useEffect(() => { void load(); }, [load]);

  const logout = async () => {
    await aj("/api/admin/auth", "POST", { action: "logout" });
    setPosts([]);
    snack("Kamu sudah keluar");
    await load();
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const r = await aj(`/api/admin/posts/${confirmDel.id}`, "DELETE");
    setConfirmDel(null);
    if (r.ok) { snack("Postingan dihapus"); await load(); }
    else snack(r.j.error || "Gagal menghapus");
  };

  const delComment = async (post: string, cid: string) => {
    const r = await aj("/api/admin/comments", "DELETE", { post, cid });
    if (r.ok) { snack("Komentar dihapus"); await load(); }
    else snack(r.j.error || "Gagal menghapus komentar");
  };

  return (
    <main className="container page">
      {sess?.demo && <DemoBanner />}
      {!sess ? (
        <div className="admin-list">
          <Skel h={88} r={24} /><Skel h={88} r={24} /><Skel h={88} r={24} />
        </div>
      ) : !sess.authed ? (
        sess.needsSetup ? <SetupForm onDone={load} /> : <LoginForm onDone={load} />
      ) : (
        <>
          <div className="admin-top">
            <h2>Postingan ({posts.length})</h2>
            <Btn variant="text" onClick={() => setPwOpen(true)}>
              <Icon name="password" size={18} />Ganti password
            </Btn>
            <Btn variant="text" className="b-danger" onClick={() => void logout()}>
              <Icon name="logout" size={18} />Keluar
            </Btn>
          </div>
          {loadingPosts ? (
            <div className="admin-list">
              <Skel h={88} r={24} /><Skel h={88} r={24} /><Skel h={88} r={24} />
            </div>
          ) : posts.length === 0 ? (
            <div className="empty">
              <Icon name="post_add" size={48} />
              <p style={{ marginTop: 10 }}>Belum ada postingan. Ketuk “+ Tambah”.</p>
            </div>
          ) : (
            <div className="admin-list">
              <AnimatePresence initial={false}>
                {posts.map((p) => (
                  <motion.div
                    key={p.id} className="admin-item" layout
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }} transition={SPRING_SOFT}
                  >
                    <div className="admin-row">
                      <img className="thumb" src={`/api/img/${p.id}?v=${p.ver}`} alt="" loading="lazy" />
                      <div className="admin-info">
                        <div className="admin-title">{p.title}</div>
                        <div className="admin-sub">
                          <a className="link" href={p.link} target="_blank" rel="noopener noreferrer nofollow">{hostOf(p.link)}</a>
                          <span className="admin-stat"><Icon name="favorite" size={15} />{p.likes}</span>
                          <span className="admin-stat"><Icon name="chat_bubble" size={15} />{p.comments}</span>
                        </div>
                      </div>
                      <Btn variant="icon" aria-label="Edit" onClick={() => { setEditing(p); setEditorOpen(true); }}>
                        <Icon name="edit" size={20} />
                      </Btn>
                      <Btn variant="icon" className="b-danger" aria-label="Hapus" onClick={() => setConfirmDel(p)}>
                        <Icon name="delete" size={20} />
                      </Btn>
                      <Btn variant="icon" aria-label="Kelola komentar" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                        <Icon name={expanded === p.id ? "expand_less" : "expand_more"} size={22} />
                      </Btn>
                    </div>
                    <AnimatePresence>
                      {expanded === p.id && (
                        <motion.div
                          className="admin-cms"
                          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          {p.commentsList.length === 0 && <span className="cm-empty">Belum ada komentar.</span>}
                          {p.commentsList.map((c) => (
                            <div className="admin-cm" key={c.id}>
                              <Avatar name={c.name} size={28} />
                              <span className="admin-cm-text">
                                <strong>{c.name}:</strong>{" "}
                                <span dangerouslySetInnerHTML={{ __html: commentHtml(c.text) }} />
                              </span>
                              <Btn variant="icon" className="b-danger" aria-label="Hapus komentar" onClick={() => void delComment(p.id, c.id)}>
                                <Icon name="close" size={18} />
                              </Btn>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          <motion.button
            className="fab fab-admin" onPointerDown={attachRipple}
            onClick={() => { setEditing(null); setEditorOpen(true); }}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 480, damping: 28, delay: 0.2 }}
            aria-label="Tambah postingan"
          >
            <Icon name="add" size={24} />
            Tambah
          </motion.button>
        </>
      )}

      <Editor open={editorOpen} post={editing} onClose={() => setEditorOpen(false)} onSaved={load} />
      <PwDialog open={pwOpen} onClose={() => setPwOpen(false)} />
      <Dialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)} icon="delete" title="Hapus postingan?"
        text={`“${confirmDel?.title ?? ""}” beserta foto, like, dan komentarnya akan dihapus permanen.`}
        actions={<>
          <Btn variant="text" onClick={() => setConfirmDel(null)}>Batal</Btn>
          <Btn variant="filled" style={{ background: "var(--md-error)", color: "var(--md-on-error)" }} onClick={() => void doDelete()}>
            Hapus
          </Btn>
        </>}
      />
    </main>
  );
}

function DemoBanner() {
  return (
    <div className="banner">
      <Icon name="cloud_off" size={22} />
      <div>
        <strong>Mode demo — database belum tersambung.</strong> Data hanya di memori dan tidak permanen.
        Cara menyambungkan: Vercel → proyekmu → tab <strong>Storage</strong> → <strong>Create Database</strong> →{" "}
        <strong>Upstash for Redis</strong> (Free) → <strong>Connect Project</strong> → <strong>Redeploy</strong>.
      </div>
    </div>
  );
}

function PwInput({ label, value, onChange, onEnter, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; onEnter?: () => void; autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div style={{ position: "relative" }}>
        <input
          className="input" type={show ? "text" : "password"} value={value} autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onEnter?.(); }}
          style={{ paddingRight: 52 }} aria-label={label}
        />
        <button
          className="btn b-icon" type="button" onPointerDown={attachRipple}
          style={{ position: "absolute", right: 6, top: 6 }}
          onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        >
          <Icon name={show ? "visibility_off" : "visibility"} size={20} />
        </button>
      </div>
    </div>
  );
}

function SetupForm({ onDone }: { onDone: () => Promise<void> }) {
  const { snack } = useApp();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pw.length < 8) { setErr("Password minimal 8 karakter."); return; }
    if (pw !== pw2) { setErr("Konfirmasi password tidak sama."); return; }
    setBusy(true);
    const r = await aj("/api/admin/auth", "POST", { action: "setup", password: pw });
    setBusy(false);
    if (r.ok) { snack("Password admin dibuat"); await onDone(); }
    else setErr(r.j.error || "Gagal membuat password");
  };

  return (
    <motion.div
      className="card" style={{ padding: 24, maxWidth: 440, margin: "24px auto" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SOFT}
    >
      <div className="dialog-icon"><Icon name="shield_person" size={32} /></div>
      <h2 className="dialog-title">Buat password admin</h2>
      <p className="dialog-text" style={{ textAlign: "center" }}>
        Pertama kali di sini? Amankan dashboard-mu dengan password (min. 8 karakter).
      </p>
      <div style={{ marginTop: 18 }}>
        <PwInput label="Password" value={pw} onChange={(v) => { setPw(v); setErr(""); }} autoFocus />
        <PwInput label="Ulangi password" value={pw2} onChange={(v) => { setPw2(v); setErr(""); }} onEnter={() => void submit()} />
        {err && <p className="field-err" style={{ marginBottom: 10 }}>{err}</p>}
        <Btn variant="filled" style={{ width: "100%", height: 48 }} disabled={busy} onClick={() => void submit()}>
          <Icon name="lock" size={18} />
          {busy ? "Menyimpan…" : "Buat password"}
        </Btn>
      </div>
    </motion.div>
  );
}

function LoginForm({ onDone }: { onDone: () => Promise<void> }) {
  const { snack } = useApp();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pw) { setErr("Masukkan password dulu."); return; }
    setBusy(true);
    const r = await aj("/api/admin/auth", "POST", { action: "login", password: pw });
    setBusy(false);
    if (r.ok) { snack("Selamat datang kembali"); await onDone(); }
    else setErr(r.j.error || "Gagal masuk");
  };

  return (
    <motion.div
      className="card" style={{ padding: 24, maxWidth: 440, margin: "24px auto" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SOFT}
    >
      <div className="dialog-icon"><Icon name="lock_person" size={32} /></div>
      <h2 className="dialog-title">Masuk admin</h2>
      <p className="dialog-text" style={{ textAlign: "center" }}>Halaman ini cuma untuk kamu. Masukkan password admin.</p>
      <div style={{ marginTop: 18 }}>
        <PwInput label="Password" value={pw} onChange={(v) => { setPw(v); setErr(""); }} onEnter={() => void submit()} autoFocus />
        {err && <p className="field-err" style={{ marginBottom: 10 }}>{err}</p>}
        <Btn variant="filled" style={{ width: "100%", height: 48 }} disabled={busy} onClick={() => void submit()}>
          <Icon name="login" size={18} />
          {busy ? "Memeriksa…" : "Masuk"}
        </Btn>
      </div>
    </motion.div>
  );
}

function PwDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snack } = useApp();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setCur(""); setNext(""); setErr(""); } }, [open]);

  const save = async () => {
    if (next.length < 8) { setErr("Password baru minimal 8 karakter."); return; }
    setBusy(true);
    const r = await aj("/api/admin/auth", "POST", { action: "password", current: cur, next });
    setBusy(false);
    if (r.ok) { snack("Password diganti"); onClose(); }
    else setErr(r.j.error || "Gagal mengganti password");
  };

  return (
    <Dialog
      open={open} onClose={onClose} icon="password" title="Ganti password"
      actions={<>
        <Btn variant="text" onClick={onClose} disabled={busy}>Batal</Btn>
        <Btn variant="filled" onClick={() => void save()} disabled={busy}>Simpan</Btn>
      </>}
    >
      <PwInput label="Password lama" value={cur} onChange={(v) => { setCur(v); setErr(""); }} />
      <PwInput label="Password baru (min. 8)" value={next} onChange={(v) => { setNext(v); setErr(""); }} onEnter={() => void save()} />
      {err && <p className="field-err">{err}</p>}
    </Dialog>
  );
}

function Editor({ open, post, onClose, onSaved }: {
  open: boolean; post: AdminPost | null; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const { snack } = useApp();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [img, setImg] = useState<Compressed | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(post?.title ?? "");
      setLink(post?.link ?? "");
      setImg(null);
      setErr("");
      setCompressing(false);
    }
  }, [open, post]);

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { snack("Pilih file gambar ya"); return; }
    setCompressing(true);
    try {
      const c = await compressImage(f);
      setImg(c);
    } catch {
      snack("Gagal memproses gambar");
    } finally {
      setCompressing(false);
    }
  };

  const save = async () => {
    const t = title.trim();
    if (!t || t.length > 120) { setErr("Judul wajib, maksimal 120 karakter."); return; }
    const l = normalizeLink(link);
    if (!l) { setErr("Link tidak valid. Contoh: contoh.com/artikel"); return; }
    if (!post && !img) { setErr("Pilih foto dulu untuk postingan baru."); return; }
    setBusy(true);
    const body: Record<string, string> = { title: t, link: l };
    if (img) body.img = img.b64;
    const r = post
      ? await aj(`/api/admin/posts/${post.id}`, "PUT", body)
      : await aj("/api/admin/posts", "POST", body);
    setBusy(false);
    if (r.ok) {
      snack(post ? "Perubahan disimpan" : "Postingan dibuat");
      onClose();
      await onSaved();
    } else setErr(r.j.error || "Gagal menyimpan");
  };

  const previewSrc = img
    ? `data:${img.mime};base64,${img.b64}`
    : post ? `/api/img/${post.id}?v=${post.ver}` : null;

  return (
    <Sheet open={open} onClose={onClose} title={post ? "Edit postingan" : "Tambah postingan"}>
      <input
        ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ""; }}
      />
      {previewSrc ? (
        <div className="photo-preview">
          <img src={previewSrc} alt="Preview foto" />
          {img && (
            <span className="photo-meta">
              {img.width}×{img.height} · {Math.round(img.bytes / 1024)} KB · {img.mime === "image/webp" ? "WebP" : "JPEG"}
            </span>
          )}
        </div>
      ) : (
        <button className="photo-pick" onPointerDown={attachRipple} onClick={() => fileRef.current?.click()}>
          <Icon name="add_photo_alternate" size={34} />
          {compressing ? "Mengompres…" : "Pilih foto (galeri / kamera)"}
        </button>
      )}
      {previewSrc && (
        <Btn variant="tonal" style={{ width: "100%", marginBottom: 14 }} disabled={compressing} onClick={() => fileRef.current?.click()}>
          <Icon name="photo_camera" size={18} />
          {compressing ? "Mengompres…" : "Ganti foto"}
        </Btn>
      )}
      {compressing && <div style={{ marginBottom: 14 }}><Skel h={10} /></div>}
      <div className="field">
        <div className="field-row">
          <span className="field-label">Judul</span>
          <span className="field-count">{title.length}/120</span>
        </div>
        <input
          className="input" value={title} maxLength={120} placeholder="Judul postingan"
          onChange={(e) => { setTitle(e.target.value); setErr(""); }}
        />
      </div>
      <div className="field">
        <span className="field-label">Link (http/https)</span>
        <input
          className="input" value={link} placeholder="contoh.com/artikel" inputMode="url"
          onChange={(e) => { setLink(e.target.value); setErr(""); }}
          onBlur={() => { const l = normalizeLink(link); if (l) setLink(l); }}
        />
      </div>
      {err && <p className="field-err" style={{ marginBottom: 10 }}>{err}</p>}
      <Btn variant="filled" style={{ width: "100%", height: 50 }} disabled={busy || compressing} onClick={() => void save()}>
        <Icon name="check" size={20} />
        {busy ? "Menyimpan…" : "Simpan"}
      </Btn>
    </Sheet>
  );
}
