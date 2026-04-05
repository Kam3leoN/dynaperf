import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type AvatarUploadOk = { ok: true; publicUrl: string; path: string };
export type AvatarUploadErr = { ok: false; message: string };
export type AvatarUploadResult = AvatarUploadOk | AvatarUploadErr;

/**
 * Détermine extension + Content-Type pour Storage (évite les noms sans extension ou les MIME vides).
 */
export function resolveAvatarFileMeta(file: File): { ext: string; contentType: string } | null {
  const mime = (file.type || "").toLowerCase().trim();
  if (mime && MIME_TO_EXT[mime]) {
    return { ext: MIME_TO_EXT[mime], contentType: mime };
  }
  const n = file.name.toLowerCase();
  if (n.endsWith(".png")) return { ext: "png", contentType: "image/png" };
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return { ext: "jpg", contentType: "image/jpeg" };
  if (n.endsWith(".webp")) return { ext: "webp", contentType: "image/webp" };
  return null;
}

const AVATAR_VARIANT_PATHS = (userId: string) =>
  [`${userId}/avatar.jpg`, `${userId}/avatar.jpeg`, `${userId}/avatar.png`, `${userId}/avatar.webp`] as const;

/**
 * Upload avatar dans le bucket `avatars` (profil collaborateur).
 * Supprime les variantes jpg/png/webp existantes pour éviter URL cassée après changement de format.
 */
export async function uploadUserAvatarToBucket(userId: string, file: File): Promise<AvatarUploadResult> {
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Image trop volumineuse (maximum 5 Mo)." };
  }
  const meta = resolveAvatarFileMeta(file);
  if (!meta) {
    return { ok: false, message: "Format non pris en charge : JPG, PNG ou WebP." };
  }
  const path = `${userId}/avatar.${meta.ext}`;

  await supabase.storage.from("avatars").remove([...AVATAR_VARIANT_PATHS(userId)]);

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: meta.contentType,
    cacheControl: "3600",
  });

  if (error) {
    return { ok: false, message: error.message || "Échec de l’upload vers le stockage." };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { ok: true, publicUrl: data.publicUrl, path };
}

/** Suffixe anti-cache pour forcer le rechargement après remplacement du fichier. */
export function withAvatarCacheBust(publicUrl: string): string {
  const sep = publicUrl.includes("?") ? "&" : "?";
  return `${publicUrl}${sep}t=${Date.now()}`;
}
