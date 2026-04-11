import type { CornerDotType, CornerSquareType, DotType, Options } from "qr-code-styling";
import { publicAssetUrl } from "@/lib/basePath";

/** Style persisté (colonne qr_style) — aligné sur qr-code-styling. */
export interface QrStyleConfig {
  dotsType: DotType;
  cornersSquareType: CornerSquareType;
  cornersDotType: CornerDotType;
  /** Cadre visuel autour de l’aperçu (CSS), pas une API externe. */
  frame: "none" | "card";
}

export const DEFAULT_QR_STYLE: QrStyleConfig = {
  dotsType: "rounded",
  cornersSquareType: "extra-rounded",
  cornersDotType: "dot",
  frame: "none",
};

const DOT_TYPES: DotType[] = ["square", "dots", "rounded", "extra-rounded", "classy", "classy-rounded"];
const CORNER_SQ: CornerSquareType[] = ["square", "dot", "extra-rounded", "rounded", "dots", "classy", "classy-rounded"];
const CORNER_DOT: CornerDotType[] = ["square", "dot", "rounded", "extra-rounded", "classy", "classy-rounded", "dots"];

function isMember<T extends string>(v: unknown, arr: readonly T[]): v is T {
  return typeof v === "string" && (arr as readonly string[]).includes(v);
}

/** Fusionne une valeur JSONB éventuelle avec les défauts (style type-safe). */
export function mergeQrStyle(raw: unknown): QrStyleConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_QR_STYLE };
  const o = raw as Record<string, unknown>;
  return {
    dotsType: isMember(o.dotsType, DOT_TYPES) ? o.dotsType : DEFAULT_QR_STYLE.dotsType,
    cornersSquareType: isMember(o.cornersSquareType, CORNER_SQ) ? o.cornersSquareType : DEFAULT_QR_STYLE.cornersSquareType,
    cornersDotType: isMember(o.cornersDotType, CORNER_DOT) ? o.cornersDotType : DEFAULT_QR_STYLE.cornersDotType,
    frame: o.frame === "card" ? "card" : "none",
  };
}

export function resolveLogoSrc(logoUrl: string | undefined): string | undefined {
  const t = (logoUrl ?? "").trim();
  if (!t) return undefined;
  if (t.startsWith("data:") || t.startsWith("blob:") || /^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return publicAssetUrl(t.replace(/^\//, ""));
  return t;
}

/** Options complètes pour QRCodeStyling (aperçu & export). */
export function buildQrStylingOptions(params: {
  value: string;
  size: number;
  fgColor: string;
  bgColor: string;
  level: "L" | "M" | "Q" | "H";
  logoUrl?: string;
  style: QrStyleConfig;
}): Options {
  const img = resolveLogoSrc(params.logoUrl);
  return {
    type: "svg",
    width: params.size,
    height: params.size,
    data: params.value.trim() || " ",
    margin: 4,
    qrOptions: {
      errorCorrectionLevel: params.level,
    },
    image: img,
    dotsOptions: {
      type: params.style.dotsType,
      color: params.fgColor,
    },
    cornersSquareOptions: {
      type: params.style.cornersSquareType,
      color: params.fgColor,
    },
    cornersDotOptions: {
      type: params.style.cornersDotType,
      color: params.fgColor,
    },
    backgroundOptions: {
      color: params.bgColor,
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.38,
      margin: 6,
      crossOrigin: "anonymous",
    },
  };
}
