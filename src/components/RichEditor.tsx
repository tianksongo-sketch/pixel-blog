"use client";
import { useCallback, useEffect, useRef, useState, type ClipboardEvent } from "react";
import { compressImage } from "@/lib/img";
import { htmlToText, sanitizeBody, softenHtml } from "@/lib/utils";
import { attachRipple, Btn, Dialog, Icon } from "./ui";
import { useApp } from "./Providers";

type Props = { initialHtml: string; editorKey: string; onChange: (html: string) => void };

export function RichEditor({ initialHtml, editorKey, onChange }: Props) {
  const { snack } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const [words, setWords] = useState(0);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState({ bold: false, italic: false, underline: false, soft: false });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkErr, setLinkErr] = useState("");

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    const t = htmlToText(html);
    setWords(t ? t.split(/\s+/).filter(Boolean).length : 0);
    changeRef.current(html);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = softenHtml(initialHtml || "");
    savedRange.current = null;
    setActive({ bold: false, italic: false, underline: false, soft: false });
    emit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey]);

  /* *teks* langsung berubah begitu bintang penutup diketik. */
  const softRule = useCallback((): boolean => {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
    const r = sel.getRangeAt(0);
    const node = r.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || !el.contains(node)) return false;
    const parent = node.parentElement;
    if (parent?.closest("em.soft-em, code, pre")) return false;

    const text = node.textContent || "";
    const upto = text.slice(0, r.startOffset);
    const m = /(^|[\s\u00A0([{"'—–-])\*([^*\n]{1,400})\*$/.exec(upto);
    if (!m) return false;

    const start = r.startOffset - m[0].length + m[1].length;
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, r.startOffset);
    range.deleteContents();

    const em = document.createElement("em");
    em.className = "soft-em";
    em.textContent = m[2];
    range.insertNode(em);

    const tail = document.createTextNode("\u00A0");
    em.parentNode?.insertBefore(tail, em.nextSibling);
    const after = document.createRange();
    after.setStart(tail, 1);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
    savedRange.current = after.cloneRange();
    return true;
  }, []);

  const saveSelection = useCallback(() => {
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    if (el.contains(r.commonAncestorContainer)) savedRange.current = r.cloneRange();
  }, []);

  useEffect(() => {
    const onSel = () => {
      const el = ref.current;
      const sel = window.getSelection();
      if (!el || !sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      if (!el.contains(r.commonAncestorContainer)) return;
      saveSelection();
      const anchor = r.startContainer.nodeType === Node.TEXT_NODE ? r.startContainer.parentElement : (r.startContainer as HTMLElement);
      const inSoft = !!anchor?.closest?.("em.soft-em");
      try {
        setActive({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
          soft: inSoft
        });
      } catch { setActive((p) => ({ ...p, soft: inSoft })); }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [saveSelection]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; emit(); }); };
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
    el.addEventListener("input", schedule);
    el.addEventListener("keyup", schedule);
    el.addEventListener("cut", schedule);
    el.addEventListener("paste", schedule);
    return () => {
      mo.disconnect();
      el.removeEventListener("input", schedule);
      el.removeEventListener("keyup", schedule);
      el.removeEventListener("cut", schedule);
      el.removeEventListener("paste", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [emit, editorKey]);

  const restore = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    const r = savedRange.current;
    if (r && el.contains(r.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(r);
    } else {
      const end = document.createRange();
      end.selectNodeContents(el);
      end.collapse(false);
      sel.removeAllRanges();
      sel.addRange(end);
    }
  };

  const exec = (cmd: string, value?: string) => {
    restore();
    try { document.execCommand(cmd, false, value); } catch { /* abaikan */ }
    saveSelection();
    emit();
  };

  const insertHtml = (html: string) => {
    restore();
    try { document.execCommand("insertHTML", false, html); } catch { /* abaikan */ }
    saveSelection();
    emit();
  };

  const toggleSoft = () => {
    restore();
    const el = ref.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    const anchor = r.startContainer.nodeType === Node.TEXT_NODE ? r.startContainer.parentElement : (r.startContainer as HTMLElement);
    const existing = anchor?.closest?.("em.soft-em") as HTMLElement | null;

    if (existing && el.contains(existing)) {
      const parent = existing.parentNode!;
      const caret = document.createRange();
      caret.setStartAfter(existing);
      caret.collapse(true);
      while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
      parent.removeChild(existing);
      sel.removeAllRanges();
      sel.addRange(caret);
      saveSelection();
      emit();
      return;
    }

    const em = document.createElement("em");
    em.className = "soft-em";
    if (r.collapsed) {
      em.textContent = "teks lembut";
      r.insertNode(em);
      const inner = document.createRange();
      inner.selectNodeContents(em);
      sel.removeAllRanges();
      sel.addRange(inner);
    } else {
      em.appendChild(r.extractContents());
      r.insertNode(em);
      const tail = document.createTextNode("\u00A0");
      em.parentNode?.insertBefore(tail, em.nextSibling);
      const after = document.createRange();
      after.setStart(tail, 1);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
    }
    saveSelection();
    emit();
  };

  const openLink = () => {
    saveSelection();
    const sel = window.getSelection();
    setLinkText(sel && sel.rangeCount ? sel.toString() : "");
    setLinkUrl("");
    setLinkErr("");
    setLinkOpen(true);
  };

  const addLink = () => {
    let url = linkUrl.trim();
    const text = linkText.trim();
    if (!url) { setLinkErr("Isi dulu link-nya."); return; }
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) url = "https://" + url;
    const valid = /^https?:\/\/[^\s]+\.[^\s]+/i.test(url) || /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/i.test(url);
    if (!valid) { setLinkErr("Link tidak valid. Contoh: contoh.com/artikel"); return; }
    const safe = sanitizeBody(`<a href="${url.replace(/"/g, "&quot;")}">${(text || url).replace(/[<>]/g, "")}</a>`);
    setLinkOpen(false);
    setTimeout(() => insertHtml(safe + "&nbsp;"), 40);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { snack("Pilih file gambar ya"); return; }
    saveSelection();
    setBusy(true);
    try {
      const c = await compressImage(file, 1400, 380 * 1024);
      const r = await fetch("/api/admin/media", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ img: c.b64 })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { snack(j.error || "Gagal mengunggah foto"); return; }
      insertHtml(`<img src="${j.url}" alt="" /><p><br></p>`);
      snack("Foto masuk ke postingan");
    } catch {
      snack("Gagal memproses foto");
    } finally {
      setBusy(false);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    if (html) insertHtml(sanitizeBody(html));
    else if (plain) insertHtml(softenHtml(plain.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")));
  };

  const onInput = () => { softRule(); emit(); };

  const tools: Array<{ icon: string; label: string; run: () => void; on: boolean; soft?: boolean } | { sep: true }> = [
    { icon: "photo_camera", label: "Kamera", run: () => camRef.current?.click(), on: false },
    { icon: "image", label: "Galeri", run: () => fileRef.current?.click(), on: false },
    { sep: true },
    { icon: "format_bold", label: "Tebal", run: () => exec("bold"), on: active.bold },
    { icon: "format_italic", label: "Miring", run: () => exec("italic"), on: active.italic },
    { icon: "blur_on", label: "Miring lembut (*teks*)", run: toggleSoft, on: active.soft, soft: true },
    { icon: "format_underlined", label: "Garis bawah", run: () => exec("underline"), on: active.underline },
    { icon: "link", label: "Link", run: openLink, on: false },
    { sep: true },
    { icon: "title", label: "Subjudul", run: () => exec("formatBlock", "<h2>"), on: false },
    { icon: "format_list_bulleted", label: "Daftar", run: () => exec("insertUnorderedList"), on: false },
    { icon: "format_quote", label: "Kutipan", run: () => exec("formatBlock", "<blockquote>"), on: false },
    { icon: "horizontal_rule", label: "Garis", run: () => exec("insertHorizontalRule"), on: false },
    { icon: "undo", label: "Urungkan", run: () => exec("undo"), on: false }
  ];

  const minutes = Math.max(1, Math.round(words / 200));

  return (
    <div className="rt-wrap">
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />

      <div className="editor-card">
        <div
          ref={ref} className="rt-editor article-body" contentEditable suppressContentEditableWarning
          role="textbox" aria-multiline="true" aria-label="Isi postingan"
          data-placeholder="Mulai tulis postinganmu…"
          onInput={onInput} onBlur={() => { saveSelection(); emit(); }} onKeyUp={saveSelection}
          onMouseUp={saveSelection} onPaste={onPaste}
        />
        <div className="rt-meta">
          {busy
            ? <span className="rt-uploading"><Icon name="cloud_upload" size={16} />Mengunggah foto…</span>
            : (
              <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", width: "100%" }}>
                <span>{words} kata · {minutes} mnt baca</span>
                <span className="soft-hint" style={{ marginLeft: "auto" }}>
                  <code>*teks*</code>
                  <Icon name="arrow_forward" size={13} />
                  <em className="soft-em">miring lembut</em>
                </span>
              </span>
            )}
        </div>
      </div>

      <div className="editor-toolbar" role="toolbar" aria-label="Format teks">
        {tools.map((t, i) => "sep" in t ? (
          <span className="tool-sep" key={`s${i}`} />
        ) : (
          <button key={t.label} type="button"
            className={`tool-btn${t.on ? " on" : ""}${t.soft && t.on ? " soft-on" : ""}`}
            aria-label={t.label} aria-pressed={t.on} title={t.label}
            onPointerDown={(e) => { e.preventDefault(); attachRipple(e); }}
            onClick={t.run} disabled={busy}>
            <Icon name={t.icon} size={22} />
          </button>
        ))}
      </div>

      <Dialog
        open={linkOpen} onClose={() => setLinkOpen(false)} title="Tambah link" icon="link"
        actions={<>
          <Btn variant="text" onClick={() => setLinkOpen(false)}>Batal</Btn>
          <Btn variant="filled" onClick={addLink}>Tambah link</Btn>
        </>}
      >
        <div className="field">
          <span className="field-label">Teks</span>
          <input className="input" value={linkText} placeholder="Teks yang ditampilkan" autoFocus
            onChange={(e) => { setLinkText(e.target.value); setLinkErr(""); }} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Link</span>
          <input className={`input${linkErr ? " err" : ""}`} value={linkUrl} placeholder="contoh.com/artikel" inputMode="url"
            onChange={(e) => { setLinkUrl(e.target.value); setLinkErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
          {linkErr && <span className="field-err">{linkErr}</span>}
        </div>
      </Dialog>
    </div>
  );
}
