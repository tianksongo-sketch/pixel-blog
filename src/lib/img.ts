"use client";

export type Compressed = { b64: string; mime: string; bytes: number; width: number; height: number };

async function loadSource(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch { /* fallback */ }
  }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Gagal membaca gambar")); };
    img.src = url;
  });
}

function draw(src: ImageBitmap | HTMLImageElement, w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(8, Math.round(w));
  canvas.height = Math.max(8, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  ctx.drawImage(src as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function webpSupport(): boolean {
  const c = document.createElement("canvas");
  c.width = 1; c.height = 1;
  return c.toDataURL("image/webp").startsWith("data:image/webp");
}

/** Maks 1600px, WebP (fallback JPEG), kualitas adaptif sampai ≤ 450 KB. */
export async function compressImage(file: File, maxSide = 1600, limit = 450 * 1024): Promise<Compressed> {
  const src = await loadSource(file);
  const sw = (src as ImageBitmap).width || (src as HTMLImageElement).naturalWidth;
  const sh = (src as ImageBitmap).height || (src as HTMLImageElement).naturalHeight;
  if (!sw || !sh) throw new Error("Dimensi gambar tidak valid");
  const mime = webpSupport() ? "image/webp" : "image/jpeg";
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  let w = sw * scale;
  let h = sh * scale;
  let last: Compressed | null = null;
  for (let round = 0; round < 7; round++) {
    const canvas = draw(src, w, h);
    for (const q of [0.85, 0.72, 0.6, 0.48]) {
      const url = canvas.toDataURL(mime, q);
      const b64 = url.split(",")[1] || "";
      const bytes = Math.floor((b64.length * 3) / 4);
      last = { b64, mime, bytes, width: canvas.width, height: canvas.height };
      if (bytes <= limit) { if ("close" in src) (src as ImageBitmap).close(); return last; }
    }
    w *= 0.82; h *= 0.82;
  }
  if ("close" in src) (src as ImageBitmap).close();
  if (!last) throw new Error("Kompresi gagal");
  return last;
}

/** Thumbnail kecil untuk placeholder instan (LQIP). */
export async function makeThumb(file: File): Promise<string> {
  try {
    const src = await loadSource(file);
    const sw = (src as ImageBitmap).width || (src as HTMLImageElement).naturalWidth;
    const sh = (src as ImageBitmap).height || (src as HTMLImageElement).naturalHeight;
    const s = 28 / Math.max(sw, sh);
    const canvas = draw(src, Math.max(4, sw * s), Math.max(4, sh * s));
    if ("close" in src) (src as ImageBitmap).close();
    const mime = webpSupport() ? "image/webp" : "image/jpeg";
    return canvas.toDataURL(mime, 0.5);
  } catch { return ""; }
}
