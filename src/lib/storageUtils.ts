import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves audit photo references to displayable URLs.
 * - Legacy full URLs (https://...) are returned as-is.
 * - Storage paths are converted to 1-hour signed URLs.
 */
export async function resolveAuditPhotoUrls(photos: string[]): Promise<string[]> {
  if (!photos || photos.length === 0) return [];

  const results: string[] = [];
  for (const ref of photos) {
    if (ref.startsWith("http")) {
      results.push(ref);
    } else {
      const { data, error } = await supabase.storage
        .from("audit-photos")
        .createSignedUrl(ref, 3600);
      if (data?.signedUrl && !error) {
        results.push(data.signedUrl);
      }
    }
  }
  return results;
}
