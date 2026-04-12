import qrcodeFactory from "qrcode-generator";
import { publicAssetUrl } from "@/lib/basePath";
import { isTransparentBgColor } from "@/lib/qrBgColor";
import { resolveLogoSrc, resolveQrPartColors, type QrStyleConfig } from "@/lib/qrCodeStyle";
import { BUILTIN_CORNER_OUTER_FALLBACK, BUILTIN_DOT_FALLBACK } from "@/lib/qrSvgBuiltinShapes";

const QR_MARGIN = 4;

function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function extractSvgInner(svg: string): string {
  const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  return m ? m[1].trim() : "";
}

/** Remplace currentColor par une couleur hex échappée ou par une référence `url(#id)` pour dégradé. */
function applyFillToFragment(fragment: string, fill: string): string {
  const repl = fill.startsWith("url(") ? fill : escapeXmlAttr(fill);
  return fragment.replace(/currentColor/gi, repl);
}

/** Charge le contenu interne d’un SVG ou `null` si absent / vide. */
async function tryLoadSvgInner(path: string): Promise<string | null> {
  try {
    const res = await fetch(publicAssetUrl(path), { cache: "force-cache" });
    if (!res.ok) return null;
    const inner = extractSvgInner(await res.text());
    return inner || null;
  } catch {
    return null;
  }
}

/** Assets `dots/*.svg` : viewBox 0 0 6 6 → une cellule module = 0..1. */
function wrapDotModuleFragment(inner: string): string {
  return `<g transform="scale(${1 / 6})">${inner}</g>`;
}

/** Une cellule module (données ou centre de repère) : 0..1 dans l’espace parent. */
function singleDotCellFragment(raw: string | null): string {
  return raw ? wrapDotModuleFragment(raw) : BUILTIN_DOT_FALLBACK;
}

/** Œil central du repère : grille 3×3 avec la même forme de module que les données. */
function tileInnerFinder3x3(cellFrag: string): string {
  const cells: string[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      cells.push(`<g transform="translate(${col},${row})">${cellFrag}</g>`);
    }
  }
  return `<g>${cells.join("")}</g>`;
}

/** Assets `corners/*.svg` (repère) : viewBox 0 0 14 14 → repère 7×7 = 0..7. */
function wrapCornerOuterFragment(inner: string): string {
  return `<g transform="scale(${7 / 14})">${inner}</g>`;
}

function isInFinderBlock(r: number, c: number, n: number): boolean {
  if (r < 7 && c < 7) return true;
  if (r < 7 && c >= n - 7) return true;
  if (r >= n - 7 && c < 7) return true;
  return false;
}

function inLogoSquare(
  r: number,
  c: number,
  n: number,
  logoSide: number,
  logoStart: number,
): boolean {
  return r >= logoStart && r < logoStart + logoSide && c >= logoStart && c < logoStart + logoSide;
}

/**
 * Rendu SVG du QR en utilisant les formes `public/qrcode/dots/`, `corners/`, `covers/`
 * (fichiers optionnels ; secours intégré si absent).
 */
export async function renderQrSvgString(params: {
  value: string;
  size: number;
  fgColor: string;
  bgColor: string;
  level: "L" | "M" | "Q" | "H";
  style: QrStyleConfig;
  logoUrl?: string;
}): Promise<string> {
  const qr = qrcodeFactory(0, params.level);
  qr.addData(params.value.trim() || " ");
  qr.make();
  const n = qr.getModuleCount();
  const margin = QR_MARGIN;
  const cell = params.size / (n + 2 * margin);
  const pc = resolveQrPartColors(params.fgColor, params.style);
  const bg = params.bgColor;
  const bgTransparent = isTransparentBgColor(bg);

  const dotId = params.style.dotModuleId;
  const outerId = params.style.cornerOuterModuleId;
  const innerModuleId = params.style.cornerInnerModuleId;

  const [dotRaw, outerRaw, innerDotRaw] = await Promise.all([
    tryLoadSvgInner(`qrcode/dots/${dotId}.svg`),
    tryLoadSvgInner(`qrcode/corners/${outerId}.svg`),
    tryLoadSvgInner(`qrcode/dots/${innerModuleId}.svg`),
  ]);

  const dotFrag = singleDotCellFragment(dotRaw);
  const innerFrag = tileInnerFinder3x3(singleDotCellFragment(innerDotRaw));
  const outerFrag = outerRaw ? wrapCornerOuterFragment(outerRaw) : BUILTIN_CORNER_OUTER_FALLBACK;

  let coverHref: string | null = null;
  if (!bgTransparent) {
    try {
      const coverUrl = publicAssetUrl("qrcode/covers/default.svg");
      const cr = await fetch(coverUrl, { cache: "force-cache" });
      if (cr.ok) coverHref = coverUrl;
    } catch {
      coverHref = null;
    }
  }

  let dotsFillAttr: string;
  const defsGrad: string[] = [];
  if (pc.dotsFill === "gradient") {
    const gradId = `qd_${Math.random().toString(36).slice(2, 11)}`;
    defsGrad.push(
      `<linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${params.size}" y2="${params.size}"><stop offset="0%" stop-color="${escapeXmlAttr(pc.dots)}"/><stop offset="100%" stop-color="${escapeXmlAttr(pc.dotsGradientEnd)}"/></linearGradient>`,
    );
    dotsFillAttr = `url(#${gradId})`;
  } else {
    dotsFillAttr = pc.dots;
  }

  const dotUse = applyFillToFragment(dotFrag, dotsFillAttr);
  const outerUse = applyFillToFragment(outerFrag, pc.outer);
  const innerUse = applyFillToFragment(innerFrag, pc.inner);

  const logoSrc = resolveLogoSrc(params.logoUrl);
  const logoSide = Math.max(3, Math.floor(n * 0.38));
  const logoStart = Math.floor((n - logoSide) / 2);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${params.size}" height="${params.size}" viewBox="0 0 ${params.size} ${params.size}" role="img" aria-label="QR code">`,
  );
  if (defsGrad.length > 0) {
    parts.push(`<defs>${defsGrad.join("")}</defs>`);
  }
  if (!bgTransparent) {
    parts.push(`<rect width="100%" height="100%" fill="${escapeXmlAttr(bg)}"/>`);
  }

  if (coverHref) {
    parts.push(
      `<image href="${escapeXmlAttr(coverHref)}" x="0" y="0" width="${params.size}" height="${params.size}" preserveAspectRatio="xMidYMid slice" opacity="0.07"/>`,
    );
  }

  const finderPositions: { r: number; c: number }[] = [
    { r: 0, c: 0 },
    { r: 0, c: n - 7 },
    { r: n - 7, c: 0 },
  ];

  for (const { r, c } of finderPositions) {
    const x = (margin + c) * cell;
    const y = (margin + r) * cell;
    parts.push(`<g transform="translate(${x},${y}) scale(${cell})">${outerUse}</g>`);
    const ix = (margin + c + 2) * cell;
    const iy = (margin + r + 2) * cell;
    parts.push(`<g transform="translate(${ix},${iy}) scale(${cell})">${innerUse}</g>`);
  }

  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (isInFinderBlock(r, c, n)) continue;
      if (logoSrc && inLogoSquare(r, c, n, logoSide, logoStart)) continue;
      if (!qr.isDark(r, c)) continue;
      const x = (margin + c) * cell;
      const y = (margin + r) * cell;
      parts.push(
        `<g transform="translate(${x},${y}) scale(${cell})">${dotUse}</g>`,
      );
    }
  }

  if (logoSrc) {
    const lz = logoSide * cell;
    const lx = (margin + logoStart) * cell;
    const ly = (margin + logoStart) * cell;
    if (bgTransparent) {
      const inset = lz * 0.06;
      const side = lz - 2 * inset;
      parts.push(
        `<image href="${escapeXmlAttr(logoSrc)}" x="${lx + inset}" y="${ly + inset}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid meet" crossorigin="anonymous"/>`,
      );
    } else {
      parts.push(
        `<rect x="${lx}" y="${ly}" width="${lz}" height="${lz}" rx="${lz * 0.08}" fill="${escapeXmlAttr(bg)}"/>`,
      );
      parts.push(
        `<image href="${escapeXmlAttr(logoSrc)}" x="${lx + lz * 0.1}" y="${ly + lz * 0.1}" width="${lz * 0.8}" height="${lz * 0.8}" preserveAspectRatio="xMidYMid meet" crossorigin="anonymous"/>`,
      );
    }
  }

  parts.push(`</svg>`);
  return parts.join("");
}
