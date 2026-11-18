import { NextResponse } from "next/server";
import { dbInfo } from "@/lib/db";
import { BUILD } from "@/lib/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const d = await dbInfo(false);
    return NextResponse.json({
      versi: BUILD,
      commit: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) || "lokal",
      cabang: process.env.VERCEL_GIT_COMMIT_REF || "lokal",
      lingkungan: process.env.VERCEL_ENV || "development",
      ...d
    });
  } catch (e) {
    return NextResponse.json({ versi: BUILD, galat: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
