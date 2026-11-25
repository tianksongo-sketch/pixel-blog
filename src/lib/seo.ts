import { listCards } from "./db";
import { siteUrl } from "./utils";

/** Gambar pratinjau bawaan: sampul tulisan terbaru, supaya share tidak pernah polos. */
export async function defaultOgImage(): Promise<string | null> {
  try {
    const cards = await listCards(false);
    const withCover = cards.find((c) => c.hasCover);
    if (withCover) return `${siteUrl()}/api/img/${withCover.id}?v=${withCover.ver}`;
  } catch { /* abaikan */ }
  return null;
}

export const SITE_DESC =
  "Catatan, cerita, dan hal-hal yang layak dibagikan. Hitam, putih, dan laut yang bergerak pelan di belakangnya.";
