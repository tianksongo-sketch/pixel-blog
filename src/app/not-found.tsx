import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "404 — Tidak Ditemukan",
  robots: { index: false, follow: false }
};

export default function NotFound() {
  return (
    <main className="container page nf">
      <div className="nf-badge">404</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em" }}>Halaman tidak ditemukan</h1>
      <p style={{ color: "var(--ink2)", fontSize: 14, maxWidth: 380, textAlign: "center" }}>
        Tautan yang kamu buka mungkin sudah dihapus, salah ketik, atau memang tidak pernah ada.
      </p>
      <a href="/" className="btn b-filled" style={{ marginTop: 8 }}>
        <span className="ms" style={{ fontSize: 18 }}>home</span>
        Kembali ke beranda
      </a>
    </main>
  );
}
