import type { QrStyleConfig } from "@/lib/qrCodeStyle";
import {
  QR_DEFAULT_CORNER_INNER_SHAPE_ID,
  QR_DEFAULT_CORNER_OUTER_SHAPE_ID,
  QR_DEFAULT_COVER_SHAPE_ID,
  QR_DEFAULT_DOT_SHAPE_ID,
} from "@/lib/qrShapeDefaults.generated";

/** Ligne `qr_shape_library` (sous-ensemble utilisé par le rendu). */
export type QrShapeLibraryRow = {
  id: string;
  kind: "dot" | "corner" | "cover";
  name: string;
  svg_markup: string;
  legacy_key: string | null;
  sort_order: number;
  is_active: boolean;
};

export function extractSvgInner(svg: string): string {
  const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  return m ? m[1].trim() : "";
}

/** Fragments internes prêts pour `renderQrSvgString` (extraits des SVG complets). */
export interface QrShapeInnerFragments {
  dotInner: string | null;
  cornerOuterInner: string | null;
  innerFinderDotInner: string | null;
  /** SVG document entier pour le voile (image), ou null si pas de voile. */
  coverSvgFull: string | null;
}

/**
 * Résout les formes à partir du catalogue chargé (Map id → ligne).
 * Secours : IDs par défaut du fichier généré si une référence manque.
 */
export function buildQrShapeInnerFragments(
  style: QrStyleConfig,
  byId: Map<string, QrShapeLibraryRow>,
): QrShapeInnerFragments {
  const dotId = byId.has(style.dotShapeId) ? style.dotShapeId : QR_DEFAULT_DOT_SHAPE_ID;
  const outerId = byId.has(style.cornerOuterShapeId) ? style.cornerOuterShapeId : QR_DEFAULT_CORNER_OUTER_SHAPE_ID;
  const innerId = byId.has(style.cornerInnerShapeId) ? style.cornerInnerShapeId : QR_DEFAULT_CORNER_INNER_SHAPE_ID;

  const dot = byId.get(dotId);
  const corner = byId.get(outerId);
  const innerDot = byId.get(innerId);

  let coverRow: QrShapeLibraryRow | null = null;
  if (style.coverShapeId === null) {
    coverRow = null;
  } else {
    const cid = style.coverShapeId ?? QR_DEFAULT_COVER_SHAPE_ID;
    if (cid && byId.has(cid)) {
      coverRow = byId.get(cid) ?? null;
    }
  }

  return {
    dotInner: dot ? extractSvgInner(dot.svg_markup) : null,
    cornerOuterInner: corner ? extractSvgInner(corner.svg_markup) : null,
    innerFinderDotInner: innerDot ? extractSvgInner(innerDot.svg_markup) : null,
    coverSvgFull: coverRow?.svg_markup?.trim() ? coverRow.svg_markup : null,
  };
}
