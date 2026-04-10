import {
  AUDIT_GALLERY_THUMB,
  createSignedFullUrl,
  createSignedImageUrlWithThumbFallback,
} from "@/lib/storageImageUrls";

/**
 * Resolves audit photo references to displayable URLs.
 * - Legacy full URLs (https://...) are returned as-is.
 * - Storage paths are converted to 1-hour signed URLs.
 */
export async function resolveAuditPhotoUrls(photos: string[]): Promise<string[]> {
  if (!photos || photos.length === 0) return [];

  const results: string[] = [];
  for (const ref of photos) {
    if (!ref || ref.trim() === "") continue;
    if (ref.startsWith("http")) {
      results.push(ref);
    } else {
      try {
        const signed = await createSignedFullUrl("audit-photos", ref, 3600);
        if (signed) {
          results.push(signed);
        } else {
          console.warn("Failed to sign audit photo URL:", ref);
        }
      } catch (e) {
        console.warn("Error resolving audit photo:", ref, e);
      }
    }
  }
  return results;
}

/** Vignette + plein écran pour la galerie (charge moins de pixels dans la grille). */
export async function resolveAuditPhotoGalleryUrls(
  photos: string[],
): Promise<{ thumb: string; full: string }[]> {
  if (!photos || photos.length === 0) return [];
  const out: { thumb: string; full: string }[] = [];
  for (const ref of photos) {
    if (!ref || ref.trim() === "") continue;
    if (ref.startsWith("http")) {
      out.push({ thumb: ref, full: ref });
      continue;
    }
    const full = await createSignedFullUrl("audit-photos", ref, 3600);
    if (!full) continue;
    const pack = await createSignedImageUrlWithThumbFallback("audit-photos", ref, 3600, AUDIT_GALLERY_THUMB);
    out.push({ full, thumb: pack?.url ?? full });
  }
  return out;
}
