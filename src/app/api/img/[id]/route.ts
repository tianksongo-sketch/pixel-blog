import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { getImg } from "@/lib/db";
import { sniffMime } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b64 = await getImg(id);
  if (!b64) return new Response("Not found", { status: 404 });
  const etag = `"${createHash("sha1").update(b64).digest("hex").slice(0, 27)}"`;
  const headers: Record<string, string> = {
    "Cache-Control": "public, max-age=31536000, immutable",
    "ETag": etag,
    "X-Content-Type-Options": "nosniff"
  };
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  const buf = Buffer.from(b64, "base64");
  headers["Content-Type"] = sniffMime(buf) || "application/octet-stream";
  return new Response(new Uint8Array(buf), { status: 200, headers });
}
