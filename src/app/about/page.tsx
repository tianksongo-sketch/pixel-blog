import type { Metadata } from "next";
import Link from "next/link";
import { listCards } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { defaultOgImage, SITE_DESC } from "@/lib/seo";
import { TopAppBar } from "@/components/TopAppBar";
import { Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const og = await defaultOgImage();
  return {
    title: "Tentang",
    description: SITE_DESC,
    openGraph: { title: "Tentang | F4KUYY", description: SITE_DESC, images: og ? [{ url: og, width: 1200, height: 900, alt: "F4KUYY" }] : undefined },
    twitter: { card: "summary_large_image", title: "Tentang | F4KUYY", images: og ? [og] : undefined }
  };
}

const STACK = [
  { icon: "deployed_code", label: "Next.js 15" },
  { icon: "code", label: "React 19" },
  { icon: "contrast", label: "Monokrom" },
  { icon: "database", label: "Upstash Redis" },
  { icon: "waves", label: "Laut CSS" }
];

export default async function AboutPage() {
  const posts = await listCards(false).catch(() => []);
  const labels = [...new Set(posts.flatMap((p) => p.labels))];
  const latest = posts[0] ?? null;

  return (
    <>
      <TopAppBar title="Tentang" back />
      <main className="container page article">
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ position: "relative", margin: 8, height: 180, borderRadius: "var(--g-r-l,30px)", overflow: "hidden" }}>
            <span className="cover-mesh" aria-hidden="true" />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "grid", placeItems: "center", alignContent: "center", gap: 14 }}>
              <span className="brand-mark" aria-hidden="true" style={{ transform: "scale(2.2)" }}><i /><i /><i /><i /></span>
              <strong style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-1px", textTransform: "uppercase", color: "var(--ink)" }}>F4KUYY</strong>
            </div>
          </div>
          <div className="card-body" style={{ padding: "12px 24px 24px" }}>
            <h1 className="article-title" style={{ fontSize: 28 }}>Tempat catatan yang layak dibagikan.</h1>
            <p style={{ color: "var(--g-dim)", fontSize: 15, lineHeight: 1.6 }}>
              Blog pribadi berisi tugas, catatan belajar, dan hal-hal kecil yang menarik untuk disimpan.
              Ditulis santai, dibaca cepat, tampilannya hitam-putih dengan laut yang bergerak pelan di belakang.
            </p>
          </div>
        </div>

        <div className="stat-strip" style={{ marginTop: 20 }}>
          <div className="stat-box"><b>{posts.length}</b><span><Icon name="article" size={14} />Tulisan</span></div>
          <div className="stat-box"><b>{labels.length}</b><span><Icon name="label" size={14} />Label</span></div>
          <div className="stat-box">
            <b style={{ fontSize: 18 }}>{latest ? formatDate(latest.createdAt).split(" ").slice(0, 2).join(" ") : "—"}</b>
            <span><Icon name="schedule" size={14} />Terbaru</span>
          </div>
        </div>

        <div className="section-head" style={{ marginTop: 8 }}><h2>Apa yang bisa kamu lakukan</h2></div>
        <div className="article-body" style={{ marginTop: 0 }}>
          <ul>
            <li><b>Cari dan saring.</b> Kolom pencarian memeriksa judul, cuplikan, dan label. Chip label menyaring satu topik sekaligus.</li>
            <li><b>Sukai dan komentari.</b> Satu orang satu suka per tulisan. Komentar cukup pakai nama, tanpa daftar akun.</li>
            <li><b>Bagikan.</b> Setiap tulisan punya tautan sendiri lengkap dengan gambar pratinjau saat dikirim ke WhatsApp, Telegram, atau X.</li>
            <li><b>Atur suasana.</b> Buka Pengaturan untuk ganti tema terang/gelap, menyalakan Lebay mode, haptic, atau mengurangi gerak.</li>
          </ul>
        </div>

        <div className="section-head" style={{ marginTop: 28 }}><h2>Dibangun dengan</h2></div>
        <div className="filter-row" style={{ paddingBottom: 8 }}>
          {STACK.map((s) => (
            <span key={s.label} className="label-chip solid" style={{ paddingRight: 16 }}>
              <Icon name={s.icon} size={16} />{s.label}
            </span>
          ))}
        </div>

        <div className="section-head" style={{ marginTop: 28 }}><h2>Privasi</h2></div>
        <div className="article-body" style={{ marginTop: 0 }}>
          <p>
            Blog ini menyimpan cookie kecil hanya kalau kamu mengizinkan: nama tampilan dan penanda acak agar suka tidak dobel.
            Tidak ada pelacak, tidak ada iklan, tidak ada data yang dijual.
          </p>
        </div>

        <div className="share-row" style={{ marginTop: 32 }}>
          <span className="share-row-label">Mulai dari sini</span>
          <div className="share-row-pills">
            <Link href="/" prefetch className="share-pill"><Icon name="home" size={18} />Beranda</Link>
            {latest && (
              <Link href={`/post/${latest.id}`} prefetch className="share-pill">
                <Icon name="auto_stories" size={18} />Tulisan terbaru
              </Link>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
