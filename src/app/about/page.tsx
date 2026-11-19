import type { Metadata } from "next";
import Link from "next/link";
import { listCards } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { TopAppBar } from "@/components/TopAppBar";
import { Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About blog",
  description: "Tentang F4KUYY — blog pribadi yang dibangun dengan Material 3 Expressive."
};

const STACK = [
  { icon: "deployed_code", label: "Next.js 15" },
  { icon: "code", label: "React 19" },
  { icon: "palette", label: "Material 3 Expressive" },
  { icon: "database", label: "Upstash Redis" },
  { icon: "animation", label: "Motion springs" }
];

export default async function AboutPage() {
  const posts = await listCards(false).catch(() => []);
  const labels = [...new Set(posts.flatMap((p) => p.labels))];
  const latest = posts[0] ?? null;

  return (
    <>
      <TopAppBar title="About blog" back />
      <main className="container page article">
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ position: "relative", margin: 8, height: 190, borderRadius: "var(--shape-xl)", overflow: "hidden" }}>
            <span className="cover-mesh" aria-hidden="true" />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "grid", placeItems: "center", alignContent: "center", gap: 14 }}>
              <span className="brand-mark" aria-hidden="true" style={{ transform: "scale(2.2)" }}><i /><i /><i /><i /></span>
              <strong style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-1px", color: "var(--md-on-primary-container)" }}>F4KUYY</strong>
            </div>
          </div>
          <div className="card-body" style={{ padding: "12px 24px 24px" }}>
            <h1 className="article-title" style={{ fontSize: 28 }}>Tempat catatan yang layak dibagikan.</h1>
            <p style={{ color: "var(--md-on-surface-variant)", fontSize: 15, lineHeight: 1.6 }}>
              Blog pribadi berisi tugas, catatan belajar, dan hal-hal kecil yang menarik untuk disimpan.
              Ditulis santai, dibaca cepat, dan tampilannya bisa kamu ubah sendiri.
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

        <div className="section-head" style={{ marginTop: 8 }}>
          <h2>Apa yang bisa kamu lakukan</h2>
        </div>
        <div className="article-body" style={{ marginTop: 0 }}>
          <ul>
            <li><b>Ubah warna sesukamu.</b> Ketuk <b>Warna</b> atau tab <b>Tema</b>, pilih satu dari 14 warna dasar — seluruh tampilan ikut menyesuaikan, terang maupun gelap.</li>
            <li><b>Cari dan saring.</b> Kolom pencarian memeriksa judul, cuplikan, dan label. Chip label menyaring satu topik sekaligus.</li>
            <li><b>Sukai dan komentari.</b> Satu orang satu suka per tulisan. Komentar cukup pakai nama, tanpa daftar akun.</li>
            <li><b>Bagikan.</b> Setiap tulisan punya tautan sendiri dengan pratinjau gambar saat dikirim ke WhatsApp, Telegram, atau X.</li>
          </ul>
        </div>

        <div className="section-head" style={{ marginTop: 28 }}>
          <h2>Dibangun dengan</h2>
        </div>
        <div className="filter-row" style={{ paddingBottom: 8 }}>
          {STACK.map((s) => (
            <span key={s.label} className="label-chip solid" style={{ paddingRight: 16 }}>
              <Icon name={s.icon} size={16} />{s.label}
            </span>
          ))}
        </div>
        <div className="article-body" style={{ marginTop: 8 }}>
          <p>
            Antarmuka mengikuti <b>Material 3 Expressive</b>: peran warna tonal, skala sudut sampai 48dp,
            bentuk yang berubah saat ditekan, dan gerak berbasis pegas. Warna dihitung dari satu warna dasar
            menjadi palet terang dan gelap yang kontrasnya tetap aman dibaca.
          </p>
          <blockquote>Desainnya boleh berubah-ubah. Isinya tetap tulisan manusia.</blockquote>
        </div>

        <div className="section-head" style={{ marginTop: 28 }}>
          <h2>Privasi</h2>
        </div>
        <div className="article-body" style={{ marginTop: 0 }}>
          <p>
            Blog ini menyimpan cookie kecil hanya kalau kamu mengizinkan: warna tema, nama tampilan,
            dan penanda acak agar suka tidak dobel. Tidak ada pelacak, tidak ada iklan, tidak ada data yang dijual.
            Kamu bisa menolak dan tetap membaca semuanya dengan normal.
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
