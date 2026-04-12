import type { CornerDotType, CornerSquareType, DotType, Options } from "qr-code-styling";
import { publicAssetUrl } from "@/lib/basePath";
import {
  QR_DEFAULT_CORNER_INNER_SHAPE_ID,
  QR_DEFAULT_CORNER_OUTER_SHAPE_ID,
  QR_DEFAULT_COVER_SHAPE_ID,
  QR_DEFAULT_DOT_SHAPE_ID,
  QR_LEGACY_SHAPE_ID_BY_KEY,
} from "@/lib/qrShapeDefaults.generated";

const HEX6 = /^#[0-9a-fA-F]{6}$/;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidLike(s: unknown): s is string {
  return typeof s === "string" && UUID_RE.test(s.trim());
}

function normHex(v: unknown, fallback: string): string {
  if (typeof v === "string" && HEX6.test(v.trim())) return v.trim();
  return fallback;
}

/** Presets de dégradé sur les modules (aperçu SVG + qr-code-styling). */
export const QR_DOTS_GRADIENT_PRESETS = [
  "linear-vertical",
  "linear-horizontal",
  "diagonal-left",
  "diagonal-right",
  "radial",
] as const;
export type QrDotsGradientPreset = (typeof QR_DOTS_GRADIENT_PRESETS)[number];

export function isQrDotsGradientPreset(v: unknown): v is QrDotsGradientPreset {
  return typeof v === "string" && (QR_DOTS_GRADIENT_PRESETS as readonly string[]).includes(v);
}

/** Libellés UI (liste déroulante). */
export const QR_DOTS_GRADIENT_LABELS: Record<QrDotsGradientPreset, string> = {
  "linear-vertical": "Linéaire vertical",
  "linear-horizontal": "Linéaire horizontal",
  "diagonal-left": "Diagonale gauche",
  "diagonal-right": "Diagonale droite",
  radial: "Radial",
};

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
  /** Type de dégradé sur les modules */
  dotsGradientPreset: QrDotsGradientPreset;
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

  let dotsGradientPreset: QrDotsGradientPreset = "diagonal-right";
  if (isQrDotsGradientPreset(p.dotsGradientPreset)) {
    dotsGradientPreset = p.dotsGradientPreset;
  } else if (typeof p.dotsGradientAngle === "number" && Number.isFinite(p.dotsGradientAngle)) {
    dotsGradientPreset = legacyAngleToPreset(p.dotsGradientAngle);
  }

  return { dots, outer, inner, dotsFill, dotsGradientEnd, dotsGradientPreset };
}

/** Ancien champ `dotsGradientAngle` (degrés) → preset le plus proche. */
function legacyAngleToPreset(a: number): QrDotsGradientPreset {
  const x = ((a % 360) + 360) % 360;
  if (x <= 15 || x >= 345 || (x >= 165 && x <= 195)) return "linear-horizontal";
  if ((x > 75 && x < 105) || (x > 255 && x < 285)) return "linear-vertical";
  if ((x > 15 && x <= 75) || (x > 195 && x < 255)) return "diagonal-right";
  if ((x >= 105 && x <= 165) || (x >= 285 && x < 345)) return "diagonal-left";
  return "diagonal-right";
}

/** Rotation (degrés) pour l’API `gradient.rotation` de qr-code-styling (linéaire uniquement). */
export function qrDotsGradientPresetToStylingRotation(preset: QrDotsGradientPreset): number {
  switch (preset) {
    case "linear-horizontal":
      return 0;
    case "linear-vertical":
      return 90;
    case "diagonal-left":
      return 135;
    case "diagonal-right":
      return 45;
    case "radial":
      return 0;
    default:
      return 45;
  }
}

/** Style persisté (colonne `qr_style`) — références vers `public.qr_shape_library`. */
export interface QrStyleConfig {
  /** Forme des modules données (`kind = dot`). */
  dotShapeId: string;
  /** Contour extérieur des repères (`kind = corner`). */
  cornerOuterShapeId: string;
  /** Centre 3×3 des repères (`kind = dot`, même famille que les modules). */
  cornerInnerShapeId: string;
  /** Voile sur l’ensemble du code (`kind = cover`) ; `null` = aucun voile. */
  coverShapeId: string | null;
  /** Cadre visuel autour de l’aperçu (CSS), pas une API externe. */
  frame: "none" | "card";
  /** Si absent ou partiel, le rendu complète avec la couleur modules (`fg_color`). */
  partColors?: Partial<QrPartColors> & {
    /** @deprecated Utiliser `dotsGradientPreset` */
    dotsGradientAngle?: number;
  };
  /**
   * Rendu des modules : bords adoucis (`roundSize: true` dans qr-code-styling) ou contours nets (`crispEdges` côté SVG).
   * @default true (adouci)
   */
  dotsRoundSize?: boolean;
  /**
   * Si vrai (défaut), dès qu’un enregistrement existe (`id` en base), le QR encode le lien `/r/:id` pour le suivi.
   * La colonne `value` du QR en base reste la cible de redirection (URL, mailto, etc.).
   */
  encodeTrackingLink?: boolean;
}

export const DEFAULT_QR_STYLE: QrStyleConfig = {
  dotShapeId: QR_DEFAULT_DOT_SHAPE_ID,
  cornerOuterShapeId: QR_DEFAULT_CORNER_OUTER_SHAPE_ID,
  cornerInnerShapeId: QR_DEFAULT_CORNER_INNER_SHAPE_ID,
  coverShapeId: QR_DEFAULT_COVER_SHAPE_ID,
  frame: "none",
  encodeTrackingLink: true,
};

const DOT_TYPES: DotType[] = ["square", "dots", "rounded", "extra-rounded", "classy", "classy-rounded"];
const CORNER_SQ: CornerSquareType[] = ["square", "dot", "extra-rounded", "rounded", "dots", "classy", "classy-rounded"];
const CORNER_DOT: CornerDotType[] = ["square", "dot", "rounded", "extra-rounded", "classy", "classy-rounded", "dots"];

/** Ancien `dotsType` (qr-code-styling) → index fichier dots historique. */
const LEGACY_DOTS_TYPE_TO_MODULE: Record<DotType, string> = {
  square: "0",
  dots: "6",
  rounded: "7",
  "extra-rounded": "5",
  classy: "3",
  "classy-rounded": "4",
};

/** Ancien `cornersSquareType` → index corners historique. */
const LEGACY_CORNER_SQUARE_TO_OUTER_MODULE: Record<CornerSquareType, string> = {
  square: "0",
  dot: "10",
  "extra-rounded": "3",
  rounded: "4",
  dots: "8",
  classy: "5",
  "classy-rounded": "12",
};

/** Ancien `cornersDotType` → index dots pour œil central. */
const LEGACY_CORNER_DOT_TO_INNER_MODULE: Record<CornerDotType, string> = {
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

function resolveDotShapeId(o: Record<string, unknown>): string {
  if (isUuidLike(o.dotShapeId)) return o.dotShapeId.trim();
  let mod: string | undefined;
  if (typeof o.dotModuleId === "string" && /^\d{1,2}$/.test(o.dotModuleId)) {
    mod = o.dotModuleId;
  } else if (isMember(o.dotsType, DOT_TYPES)) {
    mod = LEGACY_DOTS_TYPE_TO_MODULE[o.dotsType];
  }
  if (mod) {
    const id = QR_LEGACY_SHAPE_ID_BY_KEY[`dot:${mod}`];
    if (id) return id;
  }
  return QR_DEFAULT_DOT_SHAPE_ID;
}

function resolveCornerOuterShapeId(o: Record<string, unknown>): string {
  if (isUuidLike(o.cornerOuterShapeId)) return o.cornerOuterShapeId.trim();
  let mod: string | undefined;
  if (typeof o.cornerOuterModuleId === "string" && /^\d{1,2}$/.test(o.cornerOuterModuleId)) {
    mod = o.cornerOuterModuleId;
  } else if (isMember(o.cornersSquareType, CORNER_SQ)) {
    mod = LEGACY_CORNER_SQUARE_TO_OUTER_MODULE[o.cornersSquareType];
  }
  if (mod) {
    const id = QR_LEGACY_SHAPE_ID_BY_KEY[`corner:${mod}`];
    if (id) return id;
  }
  return QR_DEFAULT_CORNER_OUTER_SHAPE_ID;
}

function resolveCornerInnerShapeId(o: Record<string, unknown>): string {
  if (isUuidLike(o.cornerInnerShapeId)) return o.cornerInnerShapeId.trim();
  let mod: string | undefined;
  if (typeof o.cornerInnerModuleId === "string" && /^\d{1,2}$/.test(o.cornerInnerModuleId)) {
    mod = o.cornerInnerModuleId;
  } else if (isMember(o.cornersDotType, CORNER_DOT)) {
    mod = LEGACY_CORNER_DOT_TO_INNER_MODULE[o.cornersDotType];
  }
  if (mod) {
    const id = QR_LEGACY_SHAPE_ID_BY_KEY[`dot:${mod}`];
    if (id) return id;
  }
  return QR_DEFAULT_CORNER_INNER_SHAPE_ID;
}

function resolveCoverShapeId(o: Record<string, unknown>): string | null {
  if (o.coverShapeId === null) return null;
  if (isUuidLike(o.coverShapeId)) return o.coverShapeId.trim();
  return QR_DEFAULT_COVER_SHAPE_ID;
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
      ...(isQrDotsGradientPreset(p.dotsGradientPreset) ? { dotsGradientPreset: p.dotsGradientPreset } : {}),
      ...(typeof p.dotsGradientAngle === "number" && Number.isFinite(p.dotsGradientAngle)
        ? { dotsGradientAngle: p.dotsGradientAngle }
        : {}),
    };
    if (Object.keys(partColors).length === 0) partColors = undefined;
  }
  const dotShapeId = resolveDotShapeId(o);
  const cornerOuterShapeId = resolveCornerOuterShapeId(o);
  const cornerInnerShapeId = resolveCornerInnerShapeId(o);
  const coverShapeId = resolveCoverShapeId(o);

  const dotsRoundSize = typeof o.dotsRoundSize === "boolean" ? o.dotsRoundSize : undefined;
  const encodeTrackingLink = o.encodeTrackingLink === false ? false : true;

  return {
    dotShapeId,
    cornerOuterShapeId,
    cornerInnerShapeId,
    coverShapeId,
    frame: o.frame === "card" ? "card" : "none",
    partColors,
    encodeTrackingLink,
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
  const stops = [
    { offset: 0, color: c.dots },
    { offset: 1, color: c.dotsGradientEnd },
  ];
  const dotsGradient =
    c.dotsFill === "gradient"
      ? c.dotsGradientPreset === "radial"
        ? {
            type: "radial" as const,
            rotation: 0,
            colorStops: stops,
          }
        : {
            type: "linear" as const,
            rotation: qrDotsGradientPresetToStylingRotation(c.dotsGradientPreset),
            colorStops: stops,
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
