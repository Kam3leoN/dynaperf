import type { QrStyleConfig } from "@/lib/qrCodeStyle";

/** Ligne `qr_codes` côté client (aperçu, édition, export). */
export type QrRecord = {
  id: string;
  name: string;
  value: string;
  size: number;
  fgColor: string;
  bgColor: string;
  level: "L" | "M" | "Q" | "H";
  logoUrl?: string;
  qrStyle: QrStyleConfig;
  /** Renseigné après chargement / enregistrement (colonne `scan_count`). */
  scanCount: number;
};
