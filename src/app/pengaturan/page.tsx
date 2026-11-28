import type { Metadata } from "next";
import { AppFrame } from "@/components/os/AppFrame";
import { SettingsApp } from "@/components/os/SettingsApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pengaturan",
  description: "Atur wallpaper, kaca, gerak, dan suara FlowOS.",
  robots: { index: false, follow: true }
};

export default function PengaturanPage() {
  return (
    <AppFrame title="Pengaturan" icon="tune" gradient="linear-gradient(145deg,#5A5A72,#9A9AB4)">
      <main className="container page">
        <SettingsApp />
      </main>
    </AppFrame>
  );
}
