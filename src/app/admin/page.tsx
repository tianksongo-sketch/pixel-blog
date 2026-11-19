import type { Metadata } from "next";
import { TopAppBar } from "@/components/TopAppBar";
import { AdminApp } from "@/components/AdminApp";
import { BackupPanel } from "@/components/BackupPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true }
};

export default function AdminPage() {
  return (
    <>
      <TopAppBar title="Admin" back />
      <AdminApp />
      <div className="container" style={{ paddingBottom: 120 }}>
        <BackupPanel />
      </div>
    </>
  );
}
