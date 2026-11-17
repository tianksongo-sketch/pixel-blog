import Link from "next/link";
import { TopAppBar } from "@/components/TopAppBar";
import { Icon } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <TopAppBar title="Pixel Blog" back />
      <main className="container nf">
        <div className="nf-badge">404</div>
        <h1>Waduh, nyasar nih.</h1>
        <p>Halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
        <Link href="/" className="btn b-filled" style={{ marginTop: 8 }}>
          <Icon name="home" size={18} />
          Kembali ke beranda
        </Link>
      </main>
    </>
  );
}
