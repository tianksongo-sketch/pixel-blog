import type { Metadata } from "next";
import { AdminApp } from "@/components/AdminApp";
import { BackupPanel } from "@/components/BackupPanel";
import { AdminPower } from "@/components/AdminPower";
import { AppFrame } from "@/components/os/AppFrame";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio",
  robots: { index: false, follow: false, nocache: true }
};

export default function AdminPage() {
  return (
    <AppFrame title="Studio" icon="edit_note" gradient="linear-gradient(145deg,#FFB020,#FF6A3D)">
      <AdminApp />
      <div className="container" style={{ paddingBottom: 40 }}>
        <AdminPower />
        <BackupPanel />
      </div>
    </AppFrame>
  );
}
