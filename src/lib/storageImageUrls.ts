import type { TransformOptions } from "@supabase/storage-js";
import { supabase } from "@/integrations/supabase/client";

/** Vignettes grille Drive (~carte masonry). */
export const DRIVE_GRID_THUMB: TransformOptions = {
  width: 480,
  height: 480,
  resize: "cover",
  quality: 72,
};

/** Vignettes galerie audit (dialog détail). */
export const AUDIT_GALLERY_THUMB: TransformOptions = {
  width: 720,
  height: 480,
  resize: "cover",
  quality: 78,
};

/**
 * Extrait le chemin objet dans un bucket Supabase depuis une URL publique `getPublicUrl`.
 */
export function parseStoragePathFromPublicUrl(fullUrl: string, bucketName: string): string | null {
  try {
    const marker = `/${bucketName}/`;
    const u = new URL(fullUrl);
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const raw = u.pathname.slice(idx + marker.length);
    return raw ? decodeURIComponent(raw.split("?")[0]) : null;
  } catch {
    return null;
  }
}

/**
 * URL signée ; avec transformation image si supportée, sinon même fichier sans transform (fallback).
 */
export async function createSignedImageUrlWithThumbFallback(
  bucket: string,
  storagePath: string,
  expiresIn: number,
  thumb?: TransformOptions,
): Promise<{ url: string; isThumb: boolean } | null> {
  const cleanPath = storagePath.startsWith("/") ? storagePath.slice(1) : storagePath;
  if (thumb && Object.keys(thumb).length > 0) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(cleanPath, expiresIn, { transform: thumb });
    if (!error && data?.signedUrl) {
      return { url: data.signedUrl, isThumb: true };
    }
  }
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, expiresIn);
  if (!error && data?.signedUrl) {
    return { url: data.signedUrl, isThumb: false };
  }
  return null;
}

/**
 * URL pleine qualité (aperçu modal, téléchargement).
 */
export async function createSignedFullUrl(
  bucket: string,
  storagePath: string,
  expiresIn: number,
): Promise<string | null> {
  const cleanPath = storagePath.startsWith("/") ? storagePath.slice(1) : storagePath;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(cleanPath, expiresIn);
  if (!error && data?.signedUrl) return data.signedUrl;
  return null;
}
