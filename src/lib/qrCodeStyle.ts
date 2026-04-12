import type { CornerDotType, CornerSquareType, DotType, Options } from "qr-code-styling";
import { publicAssetUrl } from "@/lib/basePath";

/** Fichiers `public/qrcode/corners/<id>.svg` — cadre des repères (coins extérieurs). */
export const QR_CORNER_OUTER_MODULE_IDS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
] as const;
export type QrCornerOuterModuleId = (typeof QR_CORNER_OUTER_MODULE_IDS)[number];

/** Identifiants des fichiers `public/qrcode/dots/<id>.svg` (16 formes de module). */
export const QR_DOT_MODULE_IDS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
] as const;
export type QrDotModuleId = (typeof QR_DOT_MODULE_IDS)[number];

/** Couleurs par partie du QR (persistées dans `qr_style`, champs optionnels au stockage). */
export interface QrPartColors {
  /** Modules données */
  dots: string;
  /** Repères coins extérieurs */
  outer: string;
  /** Œil central des repères */
  inner: string;
  /** Remplissage des points : uni ou dégradé (sur toute la surface du QR) */
  dotsFill: "solid" | "gradient";
  /** Couleur fin de dégradé (points uniquement) */
  dotsGradientEnd: string;
  /**
   * Angle du dégradé linéaire sur les modules (0° = gauche→droite, 90° = haut→bas), aligné sur `dotsOptions.gradient.rotation` (qr-code-styling).
   */
  dotsGradientAngle: number;
}

/** Style persisté (colonne qr_style) — aligné sur qr-code-styling. */
export interface QrStyleConfig {
  /** Forme du module données : fichier `public/qrcode/dots/<0–15>.svg`. */
  dotModuleId: QrDotModuleId;
  /** Cadre des repères : fichier `public/qrcode/corners/<0–14>.svg`. */
  cornerOuterModuleId: QrCornerOuterModuleId;
  /** Centre 3×3 des repères : mêmes fichiers que les modules (`qrcode/dots/<0–15>.svg`), pavés. */
  cornerInnerModuleId: QrDotModuleId;
  /** Cadre visuel autour de l’aperçu (CSS), pas une API externe. */
  frame: "none" | "card";
  /** Si absent ou partiel, le rendu complète avec la couleur modules (`fg_color`). */
  partColors?: Partial<QrPartColors>;
  /**
   * Rendu des modules : bords adoucis (`roundSize: true` dans qr-code-styling) ou contours nets (`crispEdges` côté SVG).
   * @default true (adouci)
   */
  dotsRoundSize?: boolean;
}

export const DEFAULT_QR_STYLE: QrStyleConfig = {
  dotModuleId: "7",
  cornerOuterModuleId: "3",
  cornerInnerModuleId: "6",
  frame: "none",
};

const HEX6 = /^#[0-9a-fA-F]{6}$/;

function normHex(v: unknown, fallback: string): string {
  if (typeof v === "string" && HEX6.test(v.trim())) return v.trim();
  return fallback;
}

/** Couleurs effectives pour le rendu SVG (fallback sur la couleur modules globale). */
export function resolveQrPartColors(fgFallback: string, style: QrStyleConfig): QrPartColors {
  const fg = normHex(fgFallback, "#111827");
  const p = style.partColors ?? {};
  const dots = normHex(p.dots, fg);
  const outer = normHex(p.outer, fg);
  const inner = normHex(p.inner, fg);
  const dotsFill = p.dotsFill === "gradient" ? "gradient" : "solid";
  const dotsGradientEnd = normHex(p.dotsGradientEnd, "#2196f3");
  let dotsGradientAngle = typeof p.dotsGradientAngle === "number" && Number.isFinite(p.dotsGradientAngle) ? p.dotsGradientAngle : 45;
  dotsGradientAngle = ((dotsGradientAngle % 360) + 360) % 360;
  return { dots, outer, inner, dotsFill, dotsGradientEnd, dotsGradientAngle };
}

const DOT_TYPES: DotType[] = ["square", "dots", "rounded", "extra-rounded", "classy", "classy-rounded"];
const CORNER_SQ: CornerSquareType[] = ["square", "dot", "extra-rounded", "rounded", "dots", "classy", "classy-rounded"];
const CORNER_DOT: CornerDotType[] = ["square", "dot", "rounded", "extra-rounded", "classy", "classy-rounded", "dots"];

/** Ancien `dotsType` (qr-code-styling) → fichier numéroté sous `qrcode/dots/`. */
const LEGACY_DOTS_TYPE_TO_MODULE: Record<DotType, QrDotModuleId> = {
  square: "0",
  dots: "6",
  rounded: "7",
  "extra-rounded": "5",
  classy: "3",
  "classy-rounded": "4",
};

/** Ancien `cornersSquareType` → fichier sous `qrcode/corners/`. */
const LEGACY_CORNER_SQUARE_TO_OUTER_MODULE: Record<CornerSquareType, QrCornerOuterModuleId> = {
  square: "0",
  dot: "10",
  "extra-rounded": "3",
  rounded: "4",
  dots: "8",
  classy: "5",
  "classy-rounded": "12",
};

/** Ancien `cornersDotType` → fichier sous `qrcode/dots/` (œil central). */
const LEGACY_CORNER_DOT_TO_INNER_MODULE: Record<CornerDotType, QrDotModuleId> = {
  square: "0",
  dot: "6",
  rounded: "7",
  "extra-rounded": "5",
  dots: "6",
  classy: "3",
  "classy-rounded": "4",
};

function isMember<T extends string>(v: unknown, arr: readonly T[]): v is T {
  return typeof v === "string" && (arr as readonly string[]).includes(v);
}

function isQrDotModuleId(v: unknown): v is QrDotModuleId {
  return typeof v === "string" && (QR_DOT_MODULE_IDS as readonly string[]).includes(v);
}

function isQrCornerOuterModuleId(v: unknown): v is QrCornerOuterModuleId {
  return typeof v === "string" && (QR_CORNER_OUTER_MODULE_IDS as readonly string[]).includes(v);
}

/** Fusionne une valeur JSONB éventuelle avec les défauts (style type-safe). */
export function mergeQrStyle(raw: unknown): QrStyleConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_QR_STYLE };
  const o = raw as Record<string, unknown>;
  let partColors: QrStyleConfig["partColors"];
  const pc = o.partColors;
  if (pc && typeof pc === "object") {
    const p = pc as Record<string, unknown>;
    const dotsFill = p.dotsFill === "gradient" ? "gradient" : p.dotsFill === "solid" ? "solid" : undefined;
    partColors = {
      ...(typeof p.dots === "string" ? { dots: p.dots } : {}),
      ...(typeof p.outer === "string" ? { outer: p.outer } : {}),
      ...(typeof p.inner === "string" ? { inner: p.inner } : {}),
      ...(dotsFill ? { dotsFill } : {}),
      ...(typeof p.dotsGradientEnd === "string" ? { dotsGradientEnd: p.dotsGradientEnd } : {}),
      ...(typeof p.dotsGradientAngle === "number" && Number.isFinite(p.dotsGradientAngle)
        ? { dotsGradientAngle: p.dotsGradientAngle }
        : {}),
    };
    if (Object.keys(partColors).length === 0) partColors = undefined;
  }
  let dotModuleId: QrDotModuleId = DEFAULT_QR_STYLE.dotModuleId;
  if (isQrDotModuleId(o.dotModuleId)) {
    dotModuleId = o.dotModuleId;
  } else if (isMember(o.dotsType, DOT_TYPES)) {
    dotModuleId = LEGACY_DOTS_TYPE_TO_MODULE[o.dotsType];
  }

  let cornerOuterModuleId: QrCornerOuterModuleId = DEFAULT_QR_STYLE.cornerOuterModuleId;
  if (isQrCornerOuterModuleId(o.cornerOuterModuleId)) {
    cornerOuterModuleId = o.cornerOuterModuleId;
  } else if (isMember(o.cornersSquareType, CORNER_SQ)) {
    cornerOuterModuleId = LEGACY_CORNER_SQUARE_TO_OUTER_MODULE[o.cornersSquareType];
  }

  let cornerInnerModuleId: QrDotModuleId = DEFAULT_QR_STYLE.cornerInnerModuleId;
  if (isQrDotModuleId(o.cornerInnerModuleId)) {
    cornerInnerModuleId = o.cornerInnerModuleId;
  } else if (isMember(o.cornersDotType, CORNER_DOT)) {
    cornerInnerModuleId = LEGACY_CORNER_DOT_TO_INNER_MODULE[o.cornersDotType];
  }

  const dotsRoundSize = typeof o.dotsRoundSize === "boolean" ? o.dotsRoundSize : undefined;

  return {
    dotModuleId,
    cornerOuterModuleId,
    cornerInnerModuleId,
    frame: o.frame === "card" ? "card" : "none",
    partColors,
    ...(dotsRoundSize !== undefined ? { dotsRoundSize } : {}),
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
  const c = resolveQrPartColors(params.fgColor, params.style);
  const roundSize = params.style.dotsRoundSize !== false;
  const dotsGradient =
    c.dotsFill === "gradient"
      ? {
          type: "linear" as const,
          rotation: c.dotsGradientAngle,
          colorStops: [
            { offset: 0, color: c.dots },
            { offset: 1, color: c.dotsGradientEnd },
          ],
        }
      : undefined;
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
      type: "rounded" as DotType,
      color: c.dots,
      roundSize,
      ...(dotsGradient ? { gradient: dotsGradient } : {}),
    },
    cornersSquareOptions: {
      type: "extra-rounded" as CornerSquareType,
      color: c.outer,
    },
    cornersDotOptions: {
      type: "dot" as CornerDotType,
      color: c.inner,
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
