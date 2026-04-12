/**
 * Téléchargement fichier depuis le navigateur et rasterisation SVG → PNG pour export QR.
 */

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
    ctx.drawImage(img, 0, 0, rasterSize, rasterSize);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
