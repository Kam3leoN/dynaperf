import qrcodeFactory from "qrcode-generator";
import { publicAssetUrl } from "@/lib/basePath";
import { isTransparentBgColor } from "@/lib/qrBgColor";
import { resolveLogoSrc, type QrStyleConfig } from "@/lib/qrCodeStyle";
import { BUILTIN_CORNER_INNER, BUILTIN_CORNER_OUTER, BUILTIN_DOT_SVG } from "@/lib/qrSvgBuiltinShapes";

const QR_MARGIN = 4;

function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function extractSvgInner(svg: string): string {
  const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  return m ? m[1].trim() : "";
}

/** Remplace currentColor par la couleur d’avant-plan (les SVG dans public/qrcode doivent utiliser currentColor). */
function applyFgToSvgFragment(fragment: string, fgHex: string): string {
  return fragment.replace(/currentColor/gi, escapeXmlAttr(fgHex));
}

async function loadSvgFragment(path: string, fallback: string): Promise<string> {
  try {
    const res = await fetch(publicAssetUrl(path), { cache: "force-cache" });
    if (!res.ok) return fallback;
    const t = await res.text();
    const inner = extractSvgInner(t);
    return inner || fallback;
  } catch {
    return fallback;
  }
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
  const fg = params.fgColor;
  const bg = params.bgColor;
  const bgTransparent = isTransparentBgColor(bg);

  const [dotFrag, outerFrag, innerFrag] = await Promise.all([
    loadSvgFragment(`qrcode/dots/${params.style.dotsType}.svg`, BUILTIN_DOT_SVG[params.style.dotsType]),
    loadSvgFragment(
      `qrcode/corners/outer-${params.style.cornersSquareType}.svg`,
      BUILTIN_CORNER_OUTER[params.style.cornersSquareType],
    ),
    loadSvgFragment(
      `qrcode/corners/inner-${params.style.cornersDotType}.svg`,
      BUILTIN_CORNER_INNER[params.style.cornersDotType],
    ),
  ]);

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

  const dotUse = applyFgToSvgFragment(dotFrag, fg);
  const outerUse = applyFgToSvgFragment(outerFrag, fg);
  const innerUse = applyFgToSvgFragment(innerFrag, fg);

  const logoSrc = resolveLogoSrc(params.logoUrl);
  const logoSide = Math.max(3, Math.floor(n * 0.38));
  const logoStart = Math.floor((n - logoSide) / 2);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${params.size}" height="${params.size}" viewBox="0 0 ${params.size} ${params.size}" role="img" aria-label="QR code">`,
  );
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
    const logoPadFill = bgTransparent ? "#ffffff" : bg;
    parts.push(
      `<rect x="${lx}" y="${ly}" width="${lz}" height="${lz}" rx="${lz * 0.08}" fill="${escapeXmlAttr(logoPadFill)}" stroke="${escapeXmlAttr(fg)}" stroke-opacity="0.15" stroke-width="${cell * 0.5}"/>`,
    );
    parts.push(
      `<image href="${escapeXmlAttr(logoSrc)}" x="${lx + lz * 0.1}" y="${ly + lz * 0.1}" width="${lz * 0.8}" height="${lz * 0.8}" preserveAspectRatio="xMidYMid meet" crossorigin="anonymous"/>`,
    );
  }

  parts.push(`</svg>`);
  return parts.join("");
}
