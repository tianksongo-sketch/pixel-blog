import { NextResponse } from "next/server";
import { dbReady, listCards } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERSI = "fix-3";

export async function GET() {
  let terbaca = 0;
  let galat: string | null = null;
  try {
    terbaca = (await listCards(true)).length;
  } catch (e) {
    galat = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json({
    versi: VERSI,
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "lokal",
    cabang: process.env.VERCEL_GIT_COMMIT_REF || "lokal",
    lingkungan: process.env.VERCEL_ENV || "development",
    databaseTersambung: dbReady,
    jumlahPostingan: terbaca,
    galat,
    catatan: dbReady
      ? "Kalau versi ini sudah muncul, tulis postingan baru — sekarang akan tersimpan permanen."
      : "Upstash belum tersambung: Vercel → Storage → Create Database → Upstash for Redis → Connect Project → Redeploy."
  });
}
