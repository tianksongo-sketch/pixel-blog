import type { Metadata } from "next";
import Link from "next/link";
import { listCards } from "@/lib/db";
import { defaultOgImage, SITE_DESC } from "@/lib/seo";
import { Icon } from "@/components/ui";
import { AppFrame } from "@/components/os/AppFrame";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const og = await defaultOgImage();
  return {
    title: "Tentang", description: SITE_DESC,
    openGraph: { title: "Tentang | F4KUYY", description: SITE_DESC, images: og ? [{ url: og, width: 1200, height: 900 }] : undefined },
    twitter: { card: "summary_large_image", title: "Tentang | F4KUYY", images: og ? [og] : undefined }
  };
}

const STACK = [
  { icon: "deployed_code", label: "Next.js 15" },
  { icon: "code", label: "React 19" },
  { icon: "blur_on", label: "Liquid glass" },
  { icon: "database", label: "Upstash Redis" },
  { icon: "animation", label: "Spring motion" }
];

export default async function AboutPage() {
  const posts = await listCards(false).catch(() => []);
  const labels = [...new Set(posts.flatMap((p) => p.labels))];
  const latest = posts[0] ?? null;
  const shortDate = latest ? new Date(latest.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—";

  return (
    <AppFrame title="Tentang" icon="info" gradient="linear-gradient(145deg,#0FB5C9,#4DA3FF)">
      <main className="container page article">
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ position: "relative", margin: 8, height: 168, borderRadius: "calc(var(--f-radius) - 8px)", overflow: "hidden" }}>
            <span className="cover-mesh" aria-hidden="true" />
            <div style={{ position: "relative", zIndex: 1, height: "100%", display: "grid", placeItems: "center", alignContent: "center", gap: 10 }}>
              <Icon name="blur_on" size={34} />
              <strong style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>F4KUYY</strong>
            </div>
          </div>
          <div className="card-body" style={{ padding: "12px 20px 22px" }}>
            <h1 className="article-title" style={{ fontSize: 26 }}>Tempat catatan yang layak dibagikan.</h1>
            <p style={{ color: "var(--ink2)", fontSize: 15, lineHeight: 1.65 }}>
              Blog pribadi berisi tugas, catatan belajar, dan hal kecil yang menarik disimpan.
              Dibungkus FlowOS — antarmuka kaca cair dengan kapsul aktivitas, pusat kontrol, dan wallpaper yang hidup.
            </p>
          </div>
        </div>

        <div className="stat-strip" style={{ marginTop: 18 }}>
          <div className="stat-box"><b>{posts.length}</b><span><Icon name="article" size={13} />Tulisan</span></div>
          <div className="stat-box"><b>{labels.length}</b><span><Icon name="label" size={13} />Label</span></div>
          <div className="stat-box"><b>{shortDate}</b><span><Icon name="schedule" size={13} />Terbaru</span></div>
        </div>

        <div className="section-head"><h2>Yang bisa kamu lakukan</h2></div>
        <div className="article-body" style={{ marginTop: 0 }}>
          <ul>
            <li><b>Jelajahi seperti ponsel.</b> Beranda punya jam, widget, dan ikon aplikasi. Bar bawah selalu membawamu pulang.</li>
            <li><b>Pusat kontrol.</b> Ketuk panah di kanan atas untuk mengatur wallpaper, blur kaca, kecerahan, tempo animasi, getar, dan suara.</li>
            <li><b>Sukai dan komentari.</b> Satu orang satu suka per tulisan. Komentar cukup pakai nama.</li>
            <li><b>Bagikan.</b> Tiap tulisan punya tautan sendiri dengan gambar pratinjau.</li>
          </ul>
        </div>

        <div className="section-head" style={{ marginTop: 26 }}><h2>Dibangun dengan</h2></div>
        <div className="filter-row">
          {STACK.map((s) => (
            <span key={s.label} className="label-chip solid" style={{ paddingRight: 14 }}>
              <Icon name={s.icon} size={15} />{s.label}
            </span>
          ))}
        </div>

        <div className="section-head" style={{ marginTop: 22 }}><h2>Privasi</h2></div>
        <div className="article-body" style={{ marginTop: 0 }}>
          <p>Cookie kecil hanya disimpan kalau kamu mengizinkan: nama tampilan dan penanda acak agar suka tidak dobel. Tidak ada pelacak, iklan, atau penjualan data.</p>
        </div>

        <div className="share-row" style={{ marginTop: 26 }}>
          <span className="share-row-label">Mulai dari sini</span>
          <div className="share-row-pills">
            <Link href="/tulisan" prefetch className="share-pill"><Icon name="article" size={17} />Semua tulisan</Link>
            {latest && <Link href={`/post/${latest.id}`} prefetch className="share-pill"><Icon name="auto_stories" size={17} />Terbaru</Link>}
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
