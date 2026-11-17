"use client";

export type Compressed = { b64: string; mime: string; bytes: number; width: number; height: number };

async function loadSource(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch { /* lanjut fallback */ }
  }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Gagal membaca gambar")); };
    img.src = url;
  });
}

/** Kompres browser: maks 1600px, WebP (fallback JPEG), kualitas adaptif sampai ≤ 450 KB. */
export async function compressImage(file: File): Promise<Compressed> {
  const src = await loadSource(file);
  const sw = (src as ImageBitmap).width || (src as HTMLImageElement).naturalWidth;
  const sh = (src as ImageBitmap).height || (src as HTMLImageElement).naturalHeight;
  if (!sw || !sh) throw new Error("Dimensi gambar tidak valid");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  const probe = document.createElement("canvas");
  probe.width = 1; probe.height = 1;
  const webpOk = probe.toDataURL("image/webp").startsWith("data:image/webp");
  const mime = webpOk ? "image/webp" : "image/jpeg";
  const LIMIT = 450 * 1024;
  let w = Math.round(sw * Math.min(1, 1600 / Math.max(sw, sh)));
  let h = Math.round(sh * Math.min(1, 1600 / Math.max(sw, sh)));
  let last: Compressed | null = null;
  for (let round = 0; round < 7; round++) {
    canvas.width = Math.max(16, w);
    canvas.height = Math.max(16, h);
    ctx.drawImage(src as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    for (const q of [0.85, 0.72, 0.6, 0.48]) {
      const url = canvas.toDataURL(mime, q);
      const b64 = url.split(",")[1] || "";
      const bytes = Math.floor((b64.length * 3) / 4);
      last = { b64, mime, bytes, width: canvas.width, height: canvas.height };
      if (bytes <= LIMIT) { if ("close" in src) (src as ImageBitmap).close(); return last; }
    }
    w = Math.round(w * 0.82);
    h = Math.round(h * 0.82);
  }
  if ("close" in src) (src as ImageBitmap).close();
  if (!last) throw new Error("Kompresi gagal");
  return last;
}
