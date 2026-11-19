"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { attachRipple, Btn, Dialog, Icon, Skel, Switch, SPRING_SOFT } from "./ui";
import { useApp } from "./Providers";

type BackupPost = { id: string; record: Record<string, unknown>; img?: string | null; comments?: unknown[]; likes?: string[] };
type Backup = { format: string; version: number; exportedAt: string; count: number; posts: BackupPost[] };

const BATCH = 2;

export function BackupPanel() {
  const { snack } = useApp();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [pending, setPending] = useState<Backup | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, written: 0, skipped: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const check = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/auth", { cache: "no-store" });
      const j = await r.json();
      setAuthed(!!j.authed);
    } catch { setAuthed(false); }
  }, []);

  useEffect(() => { void check(); }, [check]);

  const doExport = async () => {
    setExporting(true);
    try {
      const r = await fetch("/api/admin/export", { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        snack(j.error || "Gagal membuat cadangan");
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `f4kuyy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      snack("Cadangan terunduh");
    } catch {
      snack("Gagal terhubung, coba lagi");
    } finally {
      setExporting(false);
    }
  };

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 60 * 1024 * 1024) { snack("Berkas terlalu besar"); return; }
    try {
      const text = await f.text();
      const data = JSON.parse(text) as Backup;
      if (data?.format !== "f4kuyy-backup" || !Array.isArray(data.posts)) {
        snack("Berkas ini bukan cadangan F4KUYY");
        return;
      }
      setPending(data);
    } catch {
      snack("Berkas rusak atau bukan JSON");
    }
  };

  const runImport = async () => {
    if (!pending) return;
    const posts = pending.posts;
    setPending(null);
    setImporting(true);
    setProgress({ done: 0, total: posts.length, written: 0, skipped: 0 });
    let written = 0;
    let skipped = 0;
    try {
      for (let i = 0; i < posts.length; i += BATCH) {
        const chunk = posts.slice(i, i + BATCH);
        const last = i + BATCH >= posts.length;
        const r = await fetch("/api/admin/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posts: chunk, overwrite, finalize: last })
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { snack(j.error || "Gagal memulihkan sebagian data"); break; }
        written += Number(j.written) || 0;
        skipped += Number(j.skipped) || 0;
        setProgress({ done: Math.min(i + chunk.length, posts.length), total: posts.length, written, skipped });
      }
      snack(`Selesai · ${written} dipulihkan, ${skipped} dilewati`);
      setTimeout(() => window.location.reload(), 900);
    } catch {
      snack("Gagal terhubung saat memulihkan");
    } finally {
      setImporting(false);
    }
  };

  if (authed === null) return <div style={{ marginTop: 20 }}><Skel h={120} r={20} /></div>;
  if (!authed) return null;

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <motion.section
      className="card"
      style={{ marginTop: 24, padding: 20 }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SOFT}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <Icon name="backup" size={24} />
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.3px", flex: 1 }}>Cadangan data</h2>
      </div>
      <p style={{ color: "var(--md-on-surface-variant)", fontSize: 14, lineHeight: 1.55 }}>
        Unduh seluruh tulisan, foto, komentar, dan suka ke satu berkas JSON. Simpan di tempat aman —
        kalau database bermasalah, semuanya bisa dikembalikan dari berkas itu.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <Btn variant="filled" disabled={exporting || importing} onClick={() => void doExport()} style={{ flex: "1 1 180px", height: 48 }}>
          <Icon name="download" size={20} />{exporting ? "Menyiapkan…" : "Unduh cadangan"}
        </Btn>
        <Btn variant="tonal" disabled={exporting || importing} onClick={() => fileRef.current?.click()} style={{ flex: "1 1 180px", height: 48 }}>
          <Icon name="upload_file" size={20} />Pulihkan dari berkas
        </Btn>
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden
        onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ""; }} />

      <div className="publish-row" style={{ marginTop: 16 }}>
        <div className="publish-copy">
          <strong>Timpa tulisan yang sudah ada?</strong>
          <span>{overwrite ? "ID yang sama akan diganti isi cadangan." : "ID yang sama dilewati, hanya yang baru masuk."}</span>
        </div>
        <Switch checked={overwrite} onChange={setOverwrite} label="Timpa yang sudah ada" />
      </div>

      {importing && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--md-on-surface-variant)", marginBottom: 6 }}>
            <span>Memulihkan… {progress.done}/{progress.total}</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--md-surface-container-highest)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--md-primary)", borderRadius: 999, transition: "width .3s cubic-bezier(.2,0,0,1)" }} />
          </div>
        </div>
      )}

      <Dialog
        open={!!pending} onClose={() => setPending(null)} icon="restore" title="Pulihkan cadangan?"
        text={`Berkas ini berisi ${pending?.count ?? 0} tulisan, dibuat ${pending ? new Date(pending.exportedAt).toLocaleString("id-ID") : ""}. ${overwrite ? "Tulisan dengan ID sama akan ditimpa." : "Tulisan dengan ID sama akan dilewati."}`}
        actions={<>
          <Btn variant="text" onClick={() => setPending(null)}>Batal</Btn>
          <Btn variant="filled" onPointerDown={attachRipple} onClick={() => void runImport()}>
            <Icon name="restore" size={18} />Pulihkan
          </Btn>
        </>}
      />
    </motion.section>
  );
}
