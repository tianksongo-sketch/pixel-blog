"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { attachRipple, Icon } from "./ui";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [atHome, setAtHome] = useState(true);

  useEffect(() => { setAtHome(pathname === "/"); }, [pathname]);

  const goSearch = () => {
    if (pathname !== "/") {
      router.push("/");
      setTimeout(() => window.dispatchEvent(new Event("px:focus-search")), 520);
    } else {
      window.dispatchEvent(new Event("px:focus-search"));
    }
  };
  const goTheme = () => window.dispatchEvent(new Event("px:open-settings"));
  const onAbout = pathname.startsWith("/about");

  return (
    <nav className="navbar" aria-label="Navigasi utama">
      <Link href="/" prefetch className={atHome ? "on" : ""} aria-current={atHome ? "page" : undefined} aria-label="Beranda">
        <span className="nav-ind" onPointerDown={attachRipple}><Icon name="home" size={24} fill={atHome} /></span>
        <span className="nav-label">Beranda</span>
      </Link>
      <button type="button" onClick={goSearch} aria-label="Cari postingan">
        <span className="nav-ind" onPointerDown={attachRipple}><Icon name="search" size={24} /></span>
        <span className="nav-label">Cari</span>
      </button>
      <button type="button" onClick={goTheme} aria-label="Buka pengaturan tampilan">
        <span className="nav-ind" onPointerDown={attachRipple}><Icon name="tune" size={24} /></span>
        <span className="nav-label">Tema</span>
      </button>
      <Link href="/about" prefetch className={onAbout ? "on" : ""} aria-current={onAbout ? "page" : undefined} aria-label="Tentang blog ini">
        <span className="nav-ind" onPointerDown={attachRipple}><Icon name="info" size={24} fill={onAbout} /></span>
        <span className="nav-label">Tentang</span>
      </Link>
    </nav>
  );
}
