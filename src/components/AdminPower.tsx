"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { formatDate, hostOf } from "@/lib/utils";
import { attachRipple, Btn, Dialog, Icon, Sheet, Skel } from "./ui";
import { useApp } from "./Providers";

type Row = {
  id: string; title: string; excerpt: string; link: string; labels: string[];
  status: "published" | "draft"; deletedAt: number; createdAt: number; updatedAt: number;
  ver: number; hasCover: boolean; likes: number; comments: number;
};
type Stats = {
  counts: { total: number; published: number; drafts: number; trashed: number; comments: number; likes: number; views: number; images: number };
  bytes: { posts: number; images: number; total: number };
  top: Array<{ id: string; title: string; views: number; likes: number; comments: number }>;
};
type SavedView = { name: string; q: string; filter: string; sort: string };

const BUDGET = 200 * 1024 * 1024;
const VIEWS_KEY = "px:admin:views";

async function aj(url: string, method = "GET", body?: unknown) {
  try {
    const r = await fetch(url, {
      method, cache: "no-store",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    return { ok: r.ok, j: await r.json().catch(() => ({})) };
  } catch { return { ok: false, j: { error: "Tidak bisa menghubungi server." } }; }
}

const kb = (n: number) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;

export function AdminPower() {
  const { snack } = useApp();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "trash">("all");
  const [sort, setSort] = useState<"new" | "old" | "title" | "hot">("new");
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [undo, setUndo] = useState<{ ids: string[]; label: string } | null>(null);
  const [views, setViews] = useState<SavedView[]>([]);
  const undoTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const a = await aj("/api/admin/auth");
    if (!a.ok || !a.j.authed) { setAuthed(false); setLoading(false); return; }
    setAuthed(true);
    const [p, s] = await Promise.all([aj("/api/admin/posts"), aj("/api/admin/stats")]);
    if (p.ok && Array.isArray(p.j.posts)) setRows(p.j.posts as Row[]);
    if (s.ok && s.j.counts) setStats(s.j as Stats);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    try { const raw = localStorage.getItem(VIEWS_KEY); if (raw) setViews(JSON.parse(raw)); } catch { /* abaikan */ }
    return () => { if (undoTimer.current) clearTimeout(undoTimer.current); };
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (filter === "trash") return !!r.deletedAt;
      if (r.deletedAt) return false;
      if (filter === "published") return r.status === "published";
      if (filter === "draft") return r.status === "draft";
      return true;
    });
    if (needle) out = out.filter((r) => (r.title + " " + r.excerpt + " " + r.labels.join(" ")).toLowerCase().includes(needle));
    return [...out].sort((a, b) => {
      if (sort === "old") return a.createdAt - b.createdAt;
      if (sort === "title") return a.title.localeCompare(b.title, "id");
      if (sort === "hot") return (b.likes + b.comments * 3) - (a.likes + a.comments * 3);
      return b.createdAt - a.createdAt;
    });
  }, [rows, q, filter, sort]);

  const allOn = shown.length > 0 && shown.every((r) => sel.includes(r.id));
  const toggle = (id: string) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleAll = () => setSel(allOn ? [] : shown.map((r) => r.id));

  const run = async (action: string, ids: string[], label: string, undoable = false) => {
    if (!ids.length || busy) return;
    setBusy(true);
    const before = rows;
    setRows((prev) => {
      if (action === "purge") return prev.filter((r) => !ids.includes(r.id));
      return prev.map((r) => {
        if (!ids.includes(r.id)) return r;
        if (action === "trash") return { ...r, deletedAt: Date.now() };
        if (action === "restore") return { ...r, deletedAt: 0 };
        if (action === "publish") return { ...r, deletedAt: 0, status: "published" as const };
        if (action === "draft") return { ...r, deletedAt: 0, status: "draft" as const };
        return r;
      });
    });
    setSel([]);
    const r = await aj("/api/admin/bulk", "POST", { action, ids });
    setBusy(false);
    if (!r.ok) { setRows(before); snack(r.j.error || "Gagal memproses"); return; }
    snack(`${label} · ${r.j.changed ?? ids.length} tulisan`);
    if (undoable) {
      if (undoTimer.current) clearTimeout(undoTimer.current);
      setUndo({ ids, label });
      undoTimer.current = window.setTimeout(() => setUndo(null), 9000);
    }
    void load();
  };

  const doUndo = async () => {
    if (!undo) return;
    const ids = undo.ids;
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    await run("restore", ids, "Dikembalikan");
  };

  const exportSel = () => {
    const data = rows.filter((r) => sel.includes(r.id));
    const blob = new Blob([JSON.stringify({ format: "f4kuyy-selection", exportedAt: new Date().toISOString(), posts: data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `f4kuyy-terpilih-${data.length}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    snack("Daftar terpilih diunduh");
  };

  const saveView = () => {
    const name = `${filter === "all" ? "Semua" : filter === "published" ? "Publik" : filter === "draft" ? "Draf" : "Sampah"}${q ? ` · ${q.slice(0, 12)}` : ""}`;
    const next = [...views.filter((v) => v.name !== name), { name, q, filter, sort }].slice(-6);
    setViews(next);
    try { localStorage.setItem(VIEWS_KEY, JSON.stringify(next)); } catch { /* abaikan */ }
    snack("Tampilan disimpan");
  };

  if (authed === null || (authed && loading)) {
    return <div className="alp"><Skel h={110} r={20} /></div>;
  }
  if (!authed) return null;

  const pct = stats ? Math.min(100, (stats.bytes.total / BUDGET) * 100) : 0;

  return (
    <section className="alp">
      <div className="alp-head">
        <Icon name="dashboard_customize" size={24} />
        <h2>Kelola massal &amp; statistik</h2>
        <Btn variant="text" onClick={() => void load()}><Icon name="refresh" size={18} />Segarkan</Btn>
      </div>

      {stats && (
        <>
          <div className="alp-meters">
            <div className="alp-meter" style={{ ["--tone" as string]: "var(--md-primary)" }}><i /><b>{stats.counts.views}</b><span><Icon name="visibility" size={13} />Pembaca</span></div>
            <div className="alp-meter" style={{ ["--tone" as string]: "var(--md-error)" }}><i /><b>{stats.counts.likes}</b><span><Icon name="favorite" size={13} />Suka</span></div>
            <div className="alp-meter" style={{ ["--tone" as string]: "var(--md-tertiary)" }}><i /><b>{stats.counts.comments}</b><span><Icon name="chat_bubble" size={13} />Komentar</span></div>
            <div className="alp-meter" style={{ ["--tone" as string]: "var(--md-secondary)" }}><i /><b>{kb(stats.bytes.total)}</b><span><Icon name="database" size={13} />Penyimpanan</span>
              <div className="alp-bar"><div style={{ width: `${pct}%` }} /></div>
            </div>
          </div>

          {stats.top.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Icon name="trending_up" size={19} /><strong style={{ fontSize: 15 }}>Paling ramai</strong>
              </div>
              <div className="alp-top">
                {stats.top.map((t, i) => (
                  <div className="alp-toprow" key={t.id}>
                    <em>{i + 1}</em>
                    <span>{t.title}</span>
                    <b>{t.views} baca · {t.likes} suka · {t.comments} komen</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="alp-tools">
        <div className="alp-search">
          <Icon name="search" size={19} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Saring judul, isi, label…" aria-label="Saring tulisan" />
          {q && <button className="btn b-icon" onPointerDown={attachRipple} onClick={() => setQ("")} aria-label="Bersihkan"><Icon name="close" size={18} /></button>}
        </div>
        <select className="alp-sel" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Status">
          <option value="all">Semua aktif</option>
          <option value="published">Terpublikasi</option>
          <option value="draft">Draf</option>
          <option value="trash">Sampah</option>
        </select>
        <select className="alp-sel" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Urutkan">
          <option value="new">Terbaru</option>
          <option value="old">Terlama</option>
          <option value="title">Judul A–Z</option>
          <option value="hot">Teramai</option>
        </select>
        <Btn variant="tonal" onClick={saveView}><Icon name="bookmark_add" size={17} />Simpan tampilan</Btn>
      </div>

      {views.length > 0 && (
        <div className="alp-views">
          {views.map((v) => (
            <button key={v.name} className="alp-view" onPointerDown={attachRipple}
              onClick={() => { setQ(v.q); setFilter(v.filter as typeof filter); setSort(v.sort as typeof sort); }}>
              <Icon name="bookmark" size={14} />{v.name}
            </button>
          ))}
          <button className="alp-view" onPointerDown={attachRipple}
            onClick={() => { setViews([]); try { localStorage.removeItem(VIEWS_KEY); } catch { /* abaikan */ } }}>
            <Icon name="delete_sweep" size={14} />Hapus semua
          </button>
        </div>
      )}

      <AnimatePresence>
        {undo && (
          <motion.div className="alp-undo" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Icon name="delete" size={18} />
            <span>{undo.ids.length} tulisan dipindah ke sampah</span>
            <Btn variant="text" onClick={() => void doUndo()}><Icon name="undo" size={16} />Urungkan</Btn>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <button className={`alp-check${allOn ? " on" : ""}`} onClick={toggleAll} aria-label="Pilih semua" aria-pressed={allOn}>
          {allOn && <Icon name="check" size={15} weight={700} />}
        </button>
        <span style={{ fontSize: 12.5, color: "var(--md-on-surface-variant)" }}>
          {shown.length} tulisan · {sel.length} dipilih
        </span>
      </div>

      <div className="alp-list">
        {shown.length === 0 && <p className="cm-empty">Tidak ada yang cocok dengan saringan ini.</p>}
        <AnimatePresence initial={false}>
          {shown.map((r) => (
            <motion.div key={r.id} className={`alp-row${sel.includes(r.id) ? " on" : ""}`} layout
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}>
              <button className={`alp-check${sel.includes(r.id) ? " on" : ""}`} onClick={() => toggle(r.id)}
                aria-label={`Pilih ${r.title}`} aria-pressed={sel.includes(r.id)}>
                {sel.includes(r.id) && <Icon name="check" size={15} weight={700} />}
              </button>
              <button className="alp-row-main" onClick={() => setDetail(r)}>
                <span className="alp-row-title">{r.title}</span>
                <span className="alp-row-sub">
                  <span className={r.deletedAt ? "badge-draft" : r.status === "draft" ? "badge-draft" : "badge-pub"}>
                    <Icon name={r.deletedAt ? "delete" : r.status === "draft" ? "draft" : "public"} size={12} />
                    {r.deletedAt ? "Sampah" : r.status === "draft" ? "Draf" : "Publik"}
                  </span>
                  <span suppressHydrationWarning>{formatDate(r.createdAt)}</span>
                  <span><Icon name="favorite" size={13} /> {r.likes}</span>
                  <span><Icon name="chat_bubble" size={13} /> {r.comments}</span>
                </span>
              </button>
              <Btn variant="icon" aria-label="Detail" onClick={() => setDetail(r)}><Icon name="chevron_right" size={22} /></Btn>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {sel.length > 0 && (
          <motion.div className="alp-bulk" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}>
            <b>{sel.length} dipilih</b>
            {filter === "trash" ? (
              <>
                <Btn variant="text" disabled={busy} onClick={() => void run("restore", sel, "Dikembalikan")}><Icon name="restore_from_trash" size={17} />Pulihkan</Btn>
                <Btn variant="text" disabled={busy} onClick={() => setConfirmPurge(true)}><Icon name="delete_forever" size={17} />Hapus permanen</Btn>
              </>
            ) : (
              <>
                <Btn variant="text" disabled={busy} onClick={() => void run("publish", sel, "Dipublikasikan")}><Icon name="publish" size={17} />Publikasikan</Btn>
                <Btn variant="text" disabled={busy} onClick={() => void run("draft", sel, "Jadi draf")}><Icon name="draft" size={17} />Draf</Btn>
                <Btn variant="text" disabled={busy} onClick={() => void run("duplicate", sel, "Diduplikat")}><Icon name="content_copy" size={17} />Duplikat</Btn>
                <Btn variant="text" disabled={busy} onClick={() => void run("trash", sel, "Ke sampah", true)}><Icon name="delete" size={17} />Sampah</Btn>
              </>
            )}
            <Btn variant="text" onClick={exportSel}><Icon name="download" size={17} />Ekspor</Btn>
            <Btn variant="icon" aria-label="Batal pilih" onClick={() => setSel([])}><Icon name="close" size={19} /></Btn>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title="Pratinjau tulisan">
        {detail && (
          <>
            <div className="alp-preview">
              {detail.hasCover
                ? <img src={`/api/img/${detail.id}?v=${detail.ver}`} alt="" />
                : <div style={{ aspectRatio: "1.91/1", display: "grid", placeItems: "center", background: "var(--md-surface-container)" }}><Icon name="image" size={34} /></div>}
              <div className="alp-preview-body">
                <div className="alp-preview-host">{hostOf(window.location.origin)} · F4KUYY</div>
                <div className="alp-preview-title">{detail.title}</div>
                <div className="alp-preview-desc">{detail.excerpt || "Belum ada cuplikan."}</div>
              </div>
            </div>
            <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--md-on-surface-variant)" }}>
              Beginilah kartu yang muncul saat tautannya dibagikan ke WhatsApp, Telegram, atau X.
            </p>
            <div className="alp-row-sub" style={{ marginTop: 14 }}>
              <span><Icon name="visibility" size={14} /> {stats?.top.find((t) => t.id === detail.id)?.views ?? 0} pembaca</span>
              <span><Icon name="favorite" size={14} /> {detail.likes}</span>
              <span><Icon name="chat_bubble" size={14} /> {detail.comments}</span>
              {detail.link && <a className="link" href={detail.link} target="_blank" rel="noopener noreferrer nofollow">{hostOf(detail.link)}</a>}
            </div>
            {detail.labels.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                {detail.labels.map((l) => <span key={l} className="label-chip solid" style={{ paddingRight: 14 }}>{l}</span>)}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
              <Link href={`/post/${detail.id}`} className="btn b-tonal" onPointerDown={attachRipple} onClick={() => setDetail(null)}>
                <Icon name="open_in_new" size={18} />Buka di blog
              </Link>
              <Btn variant="tonal" disabled={busy} onClick={() => { void run("duplicate", [detail.id], "Diduplikat"); setDetail(null); }}>
                <Icon name="content_copy" size={18} />Duplikat
              </Btn>
              {detail.deletedAt ? (
                <Btn variant="tonal" disabled={busy} onClick={() => { void run("restore", [detail.id], "Dikembalikan"); setDetail(null); }}>
                  <Icon name="restore_from_trash" size={18} />Pulihkan
                </Btn>
              ) : (
                <>
                  <Btn variant="tonal" disabled={busy} onClick={() => { void run(detail.status === "published" ? "draft" : "publish", [detail.id], "Status diubah"); setDetail(null); }}>
                    <Icon name={detail.status === "published" ? "unpublished" : "publish"} size={18} />
                    {detail.status === "published" ? "Jadikan draf" : "Publikasikan"}
                  </Btn>
                  <Btn variant="text" className="b-danger" disabled={busy} onClick={() => { void run("trash", [detail.id], "Ke sampah", true); setDetail(null); }}>
                    <Icon name="delete" size={18} />Sampah
                  </Btn>
                </>
              )}
            </div>
          </>
        )}
      </Sheet>

      <Dialog open={confirmPurge} onClose={() => setConfirmPurge(false)} icon="delete_forever" title="Hapus permanen?"
        text={`${sel.length} tulisan beserta foto, suka, dan komentarnya akan hilang selamanya. Ini tidak bisa diurungkan.`}
        actions={<>
          <Btn variant="text" onClick={() => setConfirmPurge(false)}>Batal</Btn>
          <Btn variant="filled" style={{ background: "var(--md-error)", color: "var(--md-on-error)" }}
            onClick={() => { setConfirmPurge(false); void run("purge", sel, "Dihapus permanen"); }}>
            Hapus permanen
          </Btn>
        </>} />
    </section>
  );
}