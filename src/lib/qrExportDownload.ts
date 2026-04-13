/**
 * Téléchargement fichier depuis le navigateur et rasterisation SVG → PNG pour export QR.
 */
import jsPDF from "jspdf";

export function triggerFileDownload(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function sanitizeExportBasename(name: string): string {
  const t = name.trim().replace(/[^\w\d\-_.\sàâäéèêëïîôùûüç]/gi, "").replace(/\s+/g, "-");
  return t || "qrcode";
}

/**
 * Rasterise le SVG en PNG. `designSizePx` = côté logique du QR ; `dpi` scale la sortie (référence 72 dpi).
 */
export async function svgMarkupToPngBlob(svg: string, designSizePx: number, dpi: number): Promise<Blob> {
  return svgMarkupToRasterBlob(svg, designSizePx, dpi, "image/png");
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("file-reader"));
    reader.readAsDataURL(blob);
  });
}

export async function resolveExportLogoDataUrl(logoUrl: string | undefined): Promise<string | undefined> {
  const src = (logoUrl ?? "").trim();
  if (!src) return undefined;
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return undefined;
  }
}

async function svgMarkupToRasterBlob(
  svg: string,
  designSizePx: number,
  dpi: number,
  mimeType: "image/png" | "image/jpeg",
  quality?: number,
): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image-load"));
      img.src = url;
    });
    const rasterSize = Math.max(1, Math.round((designSizePx * dpi) / 72));
    const canvas = document.createElement("canvas");
    canvas.width = rasterSize;
    canvas.height = rasterSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    if (mimeType === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rasterSize, rasterSize);
    }
    ctx.drawImage(img, 0, 0, rasterSize, rasterSize);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), mimeType, quality);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function svgMarkupToJpegBlob(svg: string, designSizePx: number, dpi: number): Promise<Blob> {
  return svgMarkupToRasterBlob(svg, designSizePx, dpi, "image/jpeg", 0.95);
}

export async function svgMarkupToPdfBlob(svg: string, designSizePx: number, dpi: number): Promise<Blob> {
  const pngBlob = await svgMarkupToPngBlob(svg, designSizePx, dpi);
  const pngDataUrl = await blobToDataUrl(pngBlob);
  const side = Math.max(1, Math.round((designSizePx * dpi) / 72));
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [side, side],
  });
  pdf.addImage(pngDataUrl, "PNG", 0, 0, side, side);
  return pdf.output("blob");
}

function uint8ToHex(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    hex.push(bytes[i].toString(16).padStart(2, "0").toUpperCase());
  }
  return hex.join("");
}

export async function svgMarkupToEpsBlob(svg: string, designSizePx: number, dpi: number): Promise<Blob> {
  const side = Math.max(1, Math.round((designSizePx * dpi) / 72));
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image-load"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, side, side);
    ctx.drawImage(img, 0, 0, side, side);
    const imageData = ctx.getImageData(0, 0, side, side).data;
    const rgb = new Uint8Array(side * side * 3);
    for (let i = 0, j = 0; i < imageData.length; i += 4, j += 3) {
      rgb[j] = imageData[i];
      rgb[j + 1] = imageData[i + 1];
      rgb[j + 2] = imageData[i + 2];
    }
    const hex = uint8ToHex(rgb);
    const eps = [
      "%!PS-Adobe-3.0 EPSF-3.0",
      `%%BoundingBox: 0 0 ${side} ${side}`,
      "%%LanguageLevel: 2",
      "%%EndComments",
      "/picstr 3 string def",
      `${side} ${side} 8`,
      `[${side} 0 0 -${side} 0 ${side}]`,
      "{ currentfile picstr readhexstring pop } false 3 colorimage",
      hex,
      "showpage",
      "%%EOF",
    ].join("\n");
    return new Blob([eps], { type: "application/postscript" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
