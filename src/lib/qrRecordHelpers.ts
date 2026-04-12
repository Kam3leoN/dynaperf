import defaultLogoDynaLipsRed from "@/assets/logo-dynalips-red.svg";
import { absoluteAppHomeUrl, collapseDuplicatePathSlashes } from "@/lib/basePath";
import type { QrRecord } from "@/types/qrCodeRecord";

const EXPORT_SIZES = [256, 512, 1024, 2048] as const;
export type QrExportSize = (typeof EXPORT_SIZES)[number];

/** Taille d’export autorisée la plus proche (alignée sur la table `qr_codes`). */
export function coerceExportSize(n: number): QrExportSize {
  const xs = EXPORT_SIZES as readonly number[];
  if (xs.includes(n)) return n as QrExportSize;
  return xs.reduce((best, x) => (Math.abs(x - n) < Math.abs(best - n) ? x : best), 512 as QrExportSize);
}

export function qrTrackingUrl(qrId: string): string {
  const base = absoluteAppHomeUrl().replace(/\/+$/, "");
  return collapseDuplicatePathSlashes(`${base}/r/${qrId}`);
}

/** Logo bundle DynaPerf (masqué à l’export si seul logo). */
export function isBundledDefaultLogo(url: string | undefined): boolean {
  if (!url) return false;
  return url === defaultLogoDynaLipsRed || url.includes("logo-dynalips-red");
}

/** Contenu encodé pour un QR enregistré (lien /r/:id si suivi activé). */
export function encodedPayloadForRecord(record: QrRecord): string {
  if (record.qrStyle.encodeTrackingLink !== false) {
    return qrTrackingUrl(record.id);
  }
  return record.value;
}

export function logoUrlForExport(record: QrRecord): string | undefined {
  const raw = (record.logoUrl || "").trim();
  if (!raw || isBundledDefaultLogo(record.logoUrl)) return undefined;
  return raw;
}
