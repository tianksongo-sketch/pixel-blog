"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { Comment, PostCard } from "@/lib/db";
import { compressImage, makeThumb } from "@/lib/img";
import { commentHtml, formatDate, hostOf } from "@/lib/utils";
import { BUILD_LABEL } from "@/lib/version";
import { attachRipple, Avatar, Btn, Dialog, Icon, LabelChip, Sheet, Skel, Switch, SPRING_SOFT } from "./ui";
import { RichEditor } from "./RichEditor";
import { useApp } from "./Providers";

type AdminPost = PostCard & { likes: number; comments: number; commentsList: Comment[] };
type Sess = { demo: boolean; needsSetup: boolean; authed: boolean };
type Diag = { demo: boolean; envTerbaca: string; indeks: number; zset: number; ditemukan: number; terbaca: number; perluPerbaiki: boolean; pesan: string };
type CoverDraft = { b64: string; thumb: string; bytes: number };
type LocalDraft = { title: string; body: string; labels: string[]; link: string; publish: boolean; ts: number };

async function aj(url: string, method = "GET", body?: unknown) {
  try {
    const r = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j };
  } catch {
    return { ok: false, status: 0, j: { error: "Tidak bisa menghubungi server." } };
  }
}

const asAdminPost = (p: PostCard): AdminPost => ({ ...p, likes: 0, comments: 0, commentsList: [] });
const draftKey = (id: string | null) => `px:draft:${id ?? "new"}`;

function readDraft(id: string | null): LocalDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return null;
    const d = JSON.parse(raw) as LocalDraft;
    return d && typeof d.title === "string" ? d : null;
  } catch { return null; }
}
function dropDraft(id: string | null) { try { localStorage.removeItem(draftKey(id)); } catch { /* abaikan */ } }

export function AdminApp() {
  const { snack } = useApp();
  const [sess, setSess] = useState<Sess | null>(null);
  const [diag, setDiag] = useState<Diag | null>(null);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [tab, setTab] = useState<"all" | "published" | "draft">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "top">("new");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdminPost | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ post: AdminPost; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDel = useRef<string | null>(null);
  const recent = useRef<Map<string, number>>(new Map());

  const load = useCallback(async (quiet = false) => {
    const s = await aj("/api/admin/auth");
    if (!s.ok) { if (!quiet) snack(s.j.error || "Gagal memuat status admin"); return; }
    setSess(s.j as Sess);
    if (!s.j.authed) return;
    if (!quiet) setLoading(true);
    const p = await aj("/api/admin/posts");
    if (!quiet) setLoading(false);
    if (p.ok) {
      const server: AdminPost[] = Array.isArray(p.j.posts) ? p.j.posts : [];
      const now = Date.now();
      setPosts((prev) => {
        const merged = [...server];
        recent.current.forEach((ts, id) => {
          if (now - ts > 60000) { recent.current.delete(id); return; }
          if (!merged.some((x) => x.id === id)) {
            const local = prev.find((x) => x.id === id);
            if (local) merged.unshift(local);
          }
        });
        return merged.sort((a, b) => b.createdAt - a.createdAt);
      });
      if (p.j.diag) setDiag(p.j.diag as Diag);
    } else if (!quiet) snack(p.j.error || "Gagal memuat daftar postingan");
  }, [snack]);

  useEffect(() => { void load(); }, [load]);

  /* Kalau halaman ditutup saat undo masih menunggu, penghapusan tetap diselesaikan. */
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const id = pendingDel.current;
    if (id) {
      try {
        void fetch(`/api/admin/posts/${id}`, { method: "DELETE", keepalive: true });
      } catch { /* abaikan */ }
    }
  }, []);

  const upsert = useCallback((post: PostCard | null) => {
    if (!post) return;
    recent.current.set(post.id, Date.now());
    setPosts((prev) => {
      const old = prev.find((x) => x.id === post.id);
      const merged: AdminPost = old
        ? { ...old, ...post, likes: old.likes, comments: old.comments, commentsList: old.commentsList }
        : asAdminPost(post);
      return [merged, ...prev.filter((x) => x.id !== post.id)].sort((a, b) => b.createdAt - a.createdAt);
    });
    setFresh(post.id);
    setTimeout(() => setFresh((f) => (f === post.id ? null : f)), 2600);
  }, []);

  const totals = useMemo(() => ({
    posts: posts.length,
    likes: posts.reduce((a, p) => a + p.likes, 0),
    comments: posts.reduce((a, p) => a + p.comments, 0)
  }), [posts]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts
      .filter((p) => tab === "all" || p.status === tab)
      .filter((p) => !needle || (p.title + " " + p.excerpt + " " + p.labels.join(" ")).toLowerCase().includes(needle))
      .sort((a, b) => sort === "top" ? b.likes - a.likes || b.createdAt - a.createdAt : b.createdAt - a.createdAt);
  }, [posts, tab, q, sort]);

  const repair = async () => {
    setRepairing(true);
    const r = await aj("/api/admin/debug", "POST");
    setRepairing(false);
    if (r.ok) {
      snack(`Indeks diperbaiki · ${r.j.tersimpan} postingan`);
      if (r.j.diag) setDiag(r.j.diag as Diag);
      await load(true);
    } else snack(r.j.error || "Gagal memperbaiki indeks");
  };

  const logout = async () => {
    await aj("/api/admin/auth", "POST", { action: "logout" });
    setPosts([]);
    snack("Kamu sudah keluar");
    await load();
  };

  const commitDelete = useCallback(async (id: string) => {
    pendingDel.current = null;
    recent.current.delete(id);
    const r = await aj(`/api/admin/posts/${id}`, "DELETE");
    if (!r.ok) { snack(r.j.error || "Gagal menghapus"); await load(true); }
  }, [snack, load]);

  const doDelete = () => {
    if (!confirmDel) return;
    const target = confirmDel;
    setConfirmDel(null);
    const index = posts.findIndex((p) => p.id === target.id);
    setPosts((prev) => prev.filter((p) => p.id !== target.id));
    if (undoTimer.current) clearTimeout(undoTimer.current);
    pendingDel.current = target.id;
    setUndo({ post: target, index: index < 0 ? 0 : index });
    undoTimer.current = setTimeout(() => { setUndo(null); void commitDelete(target.id); }, 6000);
  };

  const undoDelete = () => {
    if (!undo) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    pendingDel.current = null;
    const { post, index } = undo;
    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== post.id);
      next.splice(Math.min(index, next.length), 0, post);
      return next;
    });
    setUndo(null);
    snack("Penghapusan dibatalkan");
  };

  const delComment = async (post: string, cid: string) => {
    setPosts((prev) => prev.map((p) => p.id === post
      ? { ...p, comments: Math.max(0, p.comments - 1), commentsList: p.commentsList.filter((c) => c.id !== cid) }
      : p));
    const r = await aj("/api/admin/comments", "DELETE", { post, cid });
    if (r.ok) snack("Komentar dihapus");
    else { snack(r.j.error || "Gagal menghapus komentar"); await load(true); }
  };

  const toggleStatus = async (p: AdminPost) => {
    const next = p.status === "published" ? "draft" : "published";
    setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, status: next } : x));
    const r = await aj(`/api/admin/posts/${p.id}`, "PUT", { status: next });
    if (r.ok) { upsert(r.j.post); snack(next === "published" ? "Dipublikasikan" : "Disimpan sebagai draf"); void load(true); }
    else { snack(r.j.error || "Gagal mengubah status"); await load(true); }
  };

  const closeEditor = useCallback(() => setEditorOpen(false), []);
  const openNew = useCallback(() => { setEditingId(null); setEditorOpen(true); }, []);
  const openEdit = useCallback((id: string) => { setEditingId(id); setEditorOpen(true); }, []);
  const onSaved = useCallback(async (post: PostCard | null) => { upsert(post); await load(true); }, [upsert, load]);

  return (
    <main className="container page">
      {sess?.demo && <DemoBanner />}
      {!sess ? (
        <div className="admin-list"><Skel h={88} r={24} /><Skel h={88} r={24} /><Skel h={88} r={24} /></div>
      ) : !sess.authed ? (
        sess.needsSetup ? <SetupForm onDone={load} /> : <LoginForm onDone={load} />
      ) : (
        <>
          <div className="admin-top">
            <h2>Dashboard</h2>
            <Btn variant="text" onClick={() => setPwOpen(true)}><Icon name="password" size={18} />Password</Btn>
            <Btn variant="text" className="b-danger" onClick={() => void logout()}><Icon name="logout" size={18} />Keluar</Btn>
          </div>

          {diag && !diag.demo && (
            <div className="storage-chip">
              <Icon name={diag.perluPerbaiki ? "database_off" : "database"} size={18} />
              <span>
                Redis tersambung · <b>{diag.terbaca}</b> terbaca · <b>{diag.ditemukan}</b> tersimpan
                {diag.perluPerbaiki && " · indeks perlu diperbaiki"}
              </span>
              {(diag.perluPerbaiki || diag.terbaca === 0) && (
                <Btn variant="tonal" disabled={repairing} onClick={() => void repair()}>
                  <Icon name="build" size={16} />{repairing ? "Memperbaiki…" : "Perbaiki indeks"}
                </Btn>
              )}
            </div>
          )}

          <div className="stat-strip">
            <div className="stat-box"><b>{totals.posts}</b><span><Icon name="article" size={14} />Postingan</span></div>
            <div className="stat-box"><b>{totals.likes}</b><span><Icon name="favorite" size={14} />Suka</span></div>
            <div className="stat-box"><b>{totals.comments}</b><span><Icon name="chat_bubble" size={14} />Komentar</span></div>
          </div>

          <div className="feed-tools">
            <div className="search-pill">
              <Icon name="search" size={20} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, isi, atau label…" aria-label="Cari postingan" />
              {q && <button className="btn b-icon" onPointerDown={attachRipple} onClick={() => setQ("")} aria-label="Bersihkan pencarian"><Icon name="close" size={18} /></button>}
            </div>
            <div className="sort-toggle">
              <button className={sort === "new" ? "on" : ""} onPointerDown={attachRipple} onClick={() => setSort("new")}><Icon name="schedule" size={16} />Terbaru</button>
              <button className={sort === "top" ? "on" : ""} onPointerDown={attachRipple} onClick={() => setSort("top")}><Icon name="favorite" size={16} />Terpopuler</button>
            </div>
          </div>

          <div className="filter-row">
            <LabelChip label={`Semua (${posts.length})`} active={tab === "all"} onClick={() => setTab("all")} />
            <LabelChip label={`Terpublikasi (${posts.filter((p) => p.status === "published").length})`} active={tab === "published"} onClick={() => setTab("published")} />
            <LabelChip label={`Draf (${posts.filter((p) => p.status === "draft").length})`} active={tab === "draft"} onClick={() => setTab("draft")} />
          </div>

          <AnimatePresence>
            {undo && (
              <motion.div className="undo-bar" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={SPRING_SOFT}>
                <Icon name="delete" size={18} />
                <span>“{undo.post.title}” dihapus…</span>
                <Btn variant="text" onClick={undoDelete}><Icon name="undo" size={16} />Urungkan</Btn>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="admin-list"><Skel h={88} r={24} /><Skel h={88} r={24} /><Skel h={88} r={24} /></div>
          ) : shown.length === 0 ? (
            <div className="empty">
              <Icon name={posts.length ? "search_off" : "post_add"} size={48} />
              <p style={{ marginTop: 10 }}>
                {posts.length ? "Tidak ada yang cocok dengan filter ini." : tab === "draft" ? "Tidak ada draf." : "Belum ada postingan. Ketuk “Tulis”."}
              </p>
              {!posts.length && diag?.demo && <p style={{ marginTop: 6, fontSize: 13 }}>Mode demo aktif — sambungkan Upstash dulu agar postingan tersimpan permanen.</p>}
            </div>
          ) : (
            <div className="admin-list">
              <AnimatePresence initial={false}>
                {shown.map((p) => (
                  <motion.div key={p.id} className={`admin-item${fresh === p.id ? " fresh" : ""}`} layout
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }} transition={SPRING_SOFT}>
                    <div className="admin-row">
                      {p.hasCover
                        ? <img className="thumb" src={`/api/img/${p.id}?v=${p.ver}`} alt="" loading="lazy" decoding="async" />
                        : <span className="thumb-fallback"><Icon name="article" size={24} /></span>}
                      <div className="admin-info">
                        <div className="admin-title">{p.title}</div>
                        <div className="admin-sub">
                          <span className={p.status === "draft" ? "badge-draft" : "badge-pub"}>
                            <Icon name={p.status === "draft" ? "draft" : "public"} size={13} />
                            {p.status === "draft" ? "Draf" : "Publik"}
                          </span>
                          <span suppressHydrationWarning>{formatDate(p.createdAt)}</span>
                          <span className="admin-stat"><Icon name="favorite" size={15} />{p.likes}</span>
                          <span className="admin-stat"><Icon name="chat_bubble" size={15} />{p.comments}</span>
                          {p.link && <a className="link" href={p.link} target="_blank" rel="noopener noreferrer nofollow">{hostOf(p.link)}</a>}
                        </div>
                      </div>
                      <Btn variant="icon" aria-label={p.status === "draft" ? "Publikasikan" : "Jadikan draf"} onClick={() => void toggleStatus(p)}>
                        <Icon name={p.status === "draft" ? "publish" : "unpublished"} size={20} />
                      </Btn>
                      <Btn variant="icon" aria-label="Edit" onClick={() => openEdit(p.id)}><Icon name="edit" size={20} /></Btn>
                      <Btn variant="icon" className="b-danger" aria-label="Hapus" onClick={() => setConfirmDel(p)}><Icon name="delete" size={20} /></Btn>
                      <Btn variant="icon" aria-label="Kelola komentar" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                        <Icon name={expanded === p.id ? "expand_less" : "expand_more"} size={22} />
                      </Btn>
                    </div>
                    <AnimatePresence>
                      {expanded === p.id && (
                        <motion.div className="admin-cms" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                          <Link href={`/post/${p.id}`} className="link" style={{ fontSize: 13, fontWeight: 700 }}>Buka halaman postingan →</Link>
                          {p.commentsList.length === 0 && <span className="cm-empty">Belum ada komentar.</span>}
                          {p.commentsList.map((c) => (
                            <div className="admin-cm" key={c.id}>
                              <Avatar name={c.name} size={28} />
                              <span className="admin-cm-text"><strong>{c.name}:</strong> <span dangerouslySetInnerHTML={{ __html: commentHtml(c.text) }} /></span>
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

          <motion.button className="fab fab-admin" onPointerDown={attachRipple} onClick={openNew}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 480, damping: 28, delay: 0.15 }} aria-label="Tulis postingan">
            <Icon name="edit_note" size={24} />Tulis
          </motion.button>
        </>
      )}

      <Editor open={editorOpen} postId={editingId} onClose={closeEditor} onSaved={onSaved} />
      <PwDialog open={pwOpen} onClose={() => setPwOpen(false)} />
      <Dialog open={!!confirmDel} onClose={() => setConfirmDel(null)} icon="delete" title="Hapus postingan?"
        text={`“${confirmDel?.title ?? ""}” beserta foto, suka, dan komentarnya akan dihapus. Kamu punya 6 detik untuk mengurungkan.`}
        actions={<>
          <Btn variant="text" onClick={() => setConfirmDel(null)}>Batal</Btn>
          <Btn variant="filled" style={{ background: "var(--md-error)", color: "var(--md-on-error)" }} onClick={doDelete}>Hapus</Btn>
        </>} />
    </main>
  );
}

function DemoBanner() {
  return (
    <div className="banner">
      <Icon name="cloud_off" size={22} />
      <div>
        <strong>Mode demo — Upstash belum tersambung.</strong> Postingan hanya masuk memori sementara dan hilang saat server tidur.
        Sambungkan: Vercel → proyekmu → <strong>Storage</strong> → <strong>Create Database</strong> → <strong>Upstash for Redis</strong> (Free) → <strong>Connect Project</strong> → <strong>Redeploy</strong>.
        <div style={{ marginTop: 6, opacity: 0.8 }}>Build aktif: {BUILD_LABEL}</div>
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
        <input className="input" type={show ? "text" : "password"} value={value} autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onEnter?.(); }}
          style={{ paddingRight: 52 }} aria-label={label} />
        <button className="btn b-icon" type="button" onPointerDown={attachRipple}
          style={{ position: "absolute", right: 6, top: 6 }} onClick={() => setShow(!show)}
          aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
          <Icon name={show ? "visibility_off" : "visibility"} size={20} />
        </button>
      </div>
    </div>
  );
}

function SetupForm({ onDone }: { onDone: () => Promise<void> }) {
  const { snack } = useApp();
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (pw.length < 8) { setErr("Password minimal 8 karakter."); return; }
    if (pw !== pw2) { setErr("Konfirmasi password tidak sama."); return; }
    setBusy(true);
    const r = await aj("/api/admin/auth", "POST", { action: "setup", password: pw });
    setBusy(false);
    if (r.ok) { snack("Password admin dibuat"); await onDone(); } else setErr(r.j.error || "Gagal membuat password");
  };
  return (
    <motion.div className="card" style={{ padding: 24, maxWidth: 440, margin: "24px auto" }}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SOFT}>
      <div className="dialog-icon"><Icon name="shield_person" size={32} /></div>
      <h2 className="dialog-title">Buat password admin</h2>
      <p className="dialog-text" style={{ textAlign: "center" }}>Amankan dashboard-mu dengan password (min. 8 karakter).</p>
      <div style={{ marginTop: 18 }}>
        <PwInput label="Password" value={pw} onChange={(v) => { setPw(v); setErr(""); }} autoFocus />
        <PwInput label="Ulangi password" value={pw2} onChange={(v) => { setPw2(v); setErr(""); }} onEnter={() => void submit()} />
        {err && <p className="field-err" style={{ marginBottom: 10 }}>{err}</p>}
        <Btn variant="filled" style={{ width: "100%", height: 48 }} disabled={busy} onClick={() => void submit()}>
          <Icon name="lock" size={18} />{busy ? "Menyimpan…" : "Buat password"}
        </Btn>
      </div>
    </motion.div>
  );
}

function LoginForm({ onDone }: { onDone: () => Promise<void> }) {
  const { snack } = useApp();
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!pw) { setErr("Masukkan password dulu."); return; }
    setBusy(true);
    const r = await aj("/api/admin/auth", "POST", { action: "login", password: pw });
    setBusy(false);
    if (r.ok) { snack("Selamat datang kembali"); await onDone(); } else setErr(r.j.error || "Gagal masuk");
  };
  return (
    <motion.div className="card" style={{ padding: 24, maxWidth: 440, margin: "24px auto" }}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SOFT}>
      <div className="dialog-icon"><Icon name="lock_person" size={32} /></div>
      <h2 className="dialog-title">Masuk admin</h2>
      <p className="dialog-text" style={{ textAlign: "center" }}>Halaman ini cuma untuk kamu.</p>
      <div style={{ marginTop: 18 }}>
        <PwInput label="Password" value={pw} onChange={(v) => { setPw(v); setErr(""); }} onEnter={() => void submit()} autoFocus />
        {err && <p className="field-err" style={{ marginBottom: 10 }}>{err}</p>}
        <Btn variant="filled" style={{ width: "100%", height: 48 }} disabled={busy} onClick={() => void submit()}>
          <Icon name="login" size={18} />{busy ? "Memeriksa…" : "Masuk"}
        </Btn>
      </div>
    </motion.div>
  );
}

function PwDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snack } = useApp();
  const [cur, setCur] = useState(""); const [next, setNext] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setCur(""); setNext(""); setErr(""); } }, [open]);
  const save = async () => {
    if (next.length < 8) { setErr("Password baru minimal 8 karakter."); return; }
    setBusy(true);
    const r = await aj("/api/admin/auth", "POST", { action: "password", current: cur, next });
    setBusy(false);
    if (r.ok) { snack("Password diganti"); onClose(); } else setErr(r.j.error || "Gagal mengganti password");
  };
  return (
    <Dialog open={open} onClose={onClose} icon="password" title="Ganti password"
      actions={<>
        <Btn variant="text" onClick={onClose} disabled={busy}>Batal</Btn>
        <Btn variant="filled" onClick={() => void save()} disabled={busy}>Simpan</Btn>
      </>}>
      <PwInput label="Password lama" value={cur} onChange={(v) => { setCur(v); setErr(""); }} />
      <PwInput label="Password baru (min. 8)" value={next} onChange={(v) => { setNext(v); setErr(""); }} onEnter={() => void save()} />
      {err && <p className="field-err">{err}</p>}
    </Dialog>
  );
}

function Editor({ open, postId, onClose, onSaved }: {
  open: boolean; postId: string | null; onClose: () => void; onSaved: (post: PostCard | null) => Promise<void>;
}) {
  const { snack } = useApp();
  const [loading, setLoading] = useState(false);
  const [editorKey, setEditorKey] = useState("new");
  const [initialBody, setInitialBody] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState("");
  const [link, setLink] = useState("");
  const [publish, setPublish] = useState(true);
  const [cover, setCover] = useState<CoverDraft | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [existingCover, setExistingCover] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [restore, setRestore] = useState<LocalDraft | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Callback disimpan di ref: efek pemuatan TIDAK lagi berjalan ulang saat
     parent re-render (mis. snackbar muncul) sehingga tulisan tidak ter-reset. */
  const cb = useRef({ onClose, snack });
  cb.current = { onClose, snack };

  useEffect(() => {
    if (!open) return;
    setErr(""); setCover(null); setCoverRemoved(false); setLabelDraft(""); setCompressing(false); setRestore(null);
    let alive = true;
    const offerRestore = (updatedAt: number, curTitle: string, curBody: string) => {
      const d = readDraft(postId);
      if (d && d.ts > updatedAt && (d.title !== curTitle || d.body !== curBody)) setRestore(d);
    };
    if (!postId) {
      setTitle(""); setBody(""); setInitialBody(""); setLabels([]); setLink("");
      setPublish(true); setExistingCover(null); setEditorKey(`new-${Date.now()}`);
      offerRestore(0, "", "");
      return;
    }
    setLoading(true);
    void (async () => {
      const r = await aj(`/api/admin/posts/${postId}`);
      if (!alive) return;
      setLoading(false);
      if (!r.ok) { cb.current.snack(r.j.error || "Gagal memuat postingan"); cb.current.onClose(); return; }
      const p = r.j.post;
      setTitle(p.title ?? ""); setBody(p.body ?? ""); setInitialBody(p.body ?? "");
      setLabels(Array.isArray(p.labels) ? p.labels : []); setLink(p.link ?? "");
      setPublish(p.status !== "draft");
      setExistingCover(p.hasCover ? `/api/img/${p.id}?v=${p.ver}` : null);
      setEditorKey(`${p.id}-${Date.now()}`);
      offerRestore(Number(p.updatedAt) || 0, p.title ?? "", p.body ?? "");
    })();
    return () => { alive = false; };
  }, [open, postId]);

  /* Autosave lokal: jaring aman kalau tab tertutup atau terjadi kesalahan. */
  useEffect(() => {
    if (!open || loading || restore) return;
    if (!title.trim() && !body.trim()) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(postId), JSON.stringify({ title, body, labels, link, publish, ts: Date.now() }));
      } catch { /* kuota penuh, abaikan */ }
    }, 700);
    return () => clearTimeout(t);
  }, [open, loading, restore, postId, title, body, labels, link, publish]);

  const applyRestore = () => {
    if (!restore) return;
    setTitle(restore.title); setBody(restore.body); setInitialBody(restore.body);
    setLabels(restore.labels ?? []); setLink(restore.link ?? ""); setPublish(restore.publish !== false);
    setEditorKey(`restore-${Date.now()}`);
    setRestore(null);
    cb.current.snack("Draf lokal dipulihkan");
  };

  const addLabel = (raw: string) => {
    const s = raw.replace(/[<>"]/g, "").trim().slice(0, 24);
    if (!s) return;
    setLabels((prev) => prev.length >= 5 || prev.some((x) => x.toLowerCase() === s.toLowerCase()) ? prev : [...prev, s]);
    setLabelDraft("");
  };
  const onLabelKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addLabel(labelDraft); }
    else if (e.key === "Backspace" && !labelDraft) setLabels((prev) => prev.slice(0, -1));
  };

  const pickCover = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { snack("Pilih file gambar ya"); return; }
    setCompressing(true);
    try {
      const [c, t] = await Promise.all([compressImage(f), makeThumb(f)]);
      setCover({ b64: c.b64, thumb: t, bytes: c.bytes });
      setCoverRemoved(false);
    } catch { snack("Gagal memproses foto"); }
    finally { setCompressing(false); }
  };

  const save = async () => {
    const t = title.trim();
    if (!t) { setErr("Judul wajib diisi."); return; }
    if (t.length > 120) { setErr("Judul maksimal 120 karakter."); return; }
    const hasBody = body.replace(/<[^>]*>/g, "").trim().length > 0 || /<img\b/i.test(body);
    const hasCover = !!cover || (!!existingCover && !coverRemoved);
    if (!hasBody && !hasCover) { setErr("Tulis isi postingan atau tambahkan foto sampul."); return; }
    setBusy(true);
    const payload: Record<string, unknown> = {
      title: t, body, labels, link: link.trim(),
      status: publish ? "published" : "draft", author: "F4KUYY"
    };
    if (cover) payload.cover = { b64: cover.b64, thumb: cover.thumb };
    else if (coverRemoved) payload.cover = null;
    const r = postId
      ? await aj(`/api/admin/posts/${postId}`, "PUT", payload)
      : await aj("/api/admin/posts", "POST", payload);
    setBusy(false);
    if (r.ok && r.j.post) {
      dropDraft(postId);
      if (!postId) dropDraft(null);
      snack(publish ? "Postingan dipublikasikan" : "Draf tersimpan");
      onClose();
      await onSaved(r.j.post as PostCard);
    } else setErr(r.j.error || "Gagal menyimpan. Coba lagi.");
  };

  const coverPreview = cover ? `data:image/webp;base64,${cover.b64}` : (!coverRemoved ? existingCover : null);

  return (
    <Sheet open={open} onClose={onClose} title={postId ? "Edit postingan" : "Buat postingan"}>
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => { void pickCover(e.target.files?.[0]); e.target.value = ""; }} />
      {loading ? (
        <div style={{ display: "grid", gap: 12, paddingBottom: 20 }}>
          <Skel h={40} r={10} /><Skel h={220} r={22} /><Skel h={44} r={16} />
        </div>
      ) : (
        <>
          <AnimatePresence>
            {restore && (
              <motion.div className="storage-chip" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Icon name="history" size={18} />
                <span>Ada tulisan belum disimpan dari sesi sebelumnya.</span>
                <Btn variant="tonal" onClick={applyRestore}><Icon name="restore" size={16} />Pulihkan</Btn>
                <Btn variant="text" onClick={() => { dropDraft(postId); setRestore(null); }}>Buang</Btn>
              </motion.div>
            )}
          </AnimatePresence>

          <input className="title-input" value={title} maxLength={120} placeholder="Judul"
            aria-label="Judul postingan" onChange={(e) => { setTitle(e.target.value); setErr(""); }} />
          <div className="field-count" style={{ textAlign: "right", margin: "6px 0 12px" }}>{title.length}/120</div>

          <RichEditor editorKey={editorKey} initialHtml={initialBody} onChange={(h) => { setBody(h); setErr(""); }} />

          <div className="labels-row">
            <Icon name="label" size={20} />
            {labels.map((l) => <LabelChip key={l} label={l} onRemove={() => setLabels((p) => p.filter((x) => x !== l))} />)}
            <input className="label-input" value={labelDraft} placeholder={labels.length ? "Tambah label…" : "Label (Enter untuk menambah)"}
              aria-label="Label" onChange={(e) => setLabelDraft(e.target.value)} onKeyDown={onLabelKey} onBlur={() => addLabel(labelDraft)} />
          </div>

          <div style={{ marginTop: 16 }}>
            <span className="field-label" style={{ display: "block", marginBottom: 8 }}>Foto sampul (opsional)</span>
            {coverPreview ? (
              <div className="cover-row">
                <img src={coverPreview} alt="Sampul" />
                <div className="cover-row-info">
                  <strong>{cover ? "Sampul baru" : "Sampul saat ini"}</strong>
                  {cover ? `${Math.round(cover.bytes / 1024)} KB · terkompres otomatis` : "Ketuk ganti untuk memperbarui"}
                </div>
                <Btn variant="icon" aria-label="Ganti sampul" disabled={compressing} onClick={() => fileRef.current?.click()}>
                  <Icon name="swap_horiz" size={20} />
                </Btn>
                <Btn variant="icon" className="b-danger" aria-label="Hapus sampul"
                  onClick={() => { setCover(null); setCoverRemoved(true); setExistingCover(null); }}>
                  <Icon name="delete" size={20} />
                </Btn>
              </div>
            ) : (
              <button className="photo-pick" onPointerDown={attachRipple} disabled={compressing} onClick={() => fileRef.current?.click()}>
                <Icon name="add_photo_alternate" size={28} />
                {compressing ? "Mengompres…" : "Pilih foto sampul"}
              </button>
            )}
          </div>

          <div className="field">
            <span className="field-label">Link luar (opsional)</span>
            <input className="input" value={link} placeholder="contoh.com/artikel — boleh dikosongkan" inputMode="url"
              aria-label="Link luar opsional" onChange={(e) => { setLink(e.target.value); setErr(""); }} />
          </div>

          <div className="publish-row">
            <div className="publish-copy">
              <strong>Publikasikan sekarang?</strong>
              <span>{publish ? "Langsung tampil di beranda." : "Disimpan sebagai draf, hanya kamu yang melihat."}</span>
            </div>
            <Switch checked={publish} onChange={setPublish} label="Publikasikan sekarang" />
          </div>

          {err && <p className="field-err" style={{ marginBottom: 10 }}>{err}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Btn variant="text" onClick={onClose} disabled={busy} style={{ flex: "0 0 auto" }}>Batal</Btn>
            <Btn variant="filled" style={{ flex: 1, height: 50 }} disabled={busy || compressing} onClick={() => void save()}>
              <Icon name={publish ? "send" : "save"} size={20} />
              {busy ? "Menyimpan…" : publish ? "Publikasikan" : "Simpan draf"}
            </Btn>
          </div>
        </>
      )}
    </Sheet>
  );
}
