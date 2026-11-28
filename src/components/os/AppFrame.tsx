"use client";
import { useRouter } from "next/navigation";
import { Icon } from "../ui";
import { buzz, blip } from "@/lib/flow";

export function AppFrame({ title, icon, gradient, children }: {
  title: string; icon: string; gradient: string; children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <>
      <div className="app-head">
        <div className="container">
          <div className="app-head-in gl gl-rim">
            <span className="app-head-ic" style={{ background: gradient }}><Icon name={icon} size={19} /></span>
            <b>{title}</b>
            <button className="btn b-icon" aria-label="Tutup aplikasi"
              onClick={() => { buzz(8); blip(520); window.dispatchEvent(new CustomEvent("px:navigate", { detail: { href: "/" } })); }}>
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
