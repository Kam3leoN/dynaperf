import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { isTransparentBgColor } from "@/lib/qrBgColor";
import type { QrStyleConfig } from "@/lib/qrCodeStyle";
import { renderQrSvgString } from "@/lib/qrSvgRender";

export interface QrStylingPreviewProps {
  value: string;
  size: number;
  fgColor: string;
  bgColor: string;
  level: "L" | "M" | "Q" | "H";
  logoUrl?: string;
  style: QrStyleConfig;
  className?: string;
}

/**
 * Aperçu QR : rendu SVG avec formes `public/qrcode/dots/`, `corners/`, `covers/default.svg` (fichiers optionnels).
 */
export function QrStylingPreview({
  value,
  size,
  fgColor,
  bgColor,
  level,
  logoUrl,
  style,
  className,
}: QrStylingPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let cancelled = false;
    void (async () => {
      try {
        const svg = await renderQrSvgString({
          value,
          size,
          fgColor,
          bgColor,
          level,
          style,
          logoUrl,
        });
        if (!cancelled) el.innerHTML = svg;
      } catch {
        if (!cancelled) el.innerHTML = "";
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    value,
    size,
    fgColor,
    bgColor,
    level,
    logoUrl,
    style.dotModuleId,
    style.cornersSquareType,
    style.cornersDotType,
    style.frame,
    JSON.stringify(style.partColors),
  ]);

  const showChecker =
    style.frame !== "card" && isTransparentBgColor(bgColor);

  return (
    <div
      className={cn(
        "mx-auto w-fit rounded-lg p-2",
        style.frame === "card" && "rounded-2xl border border-border/50 bg-card p-4 shadow-sm",
        !showChecker && style.frame !== "card" && "bg-white",
        className,
      )}
      style={
        showChecker
          ? {
              backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%)",
              backgroundSize: "18px 18px",
            }
          : undefined
      }
    >
      <div ref={hostRef} className="flex items-center justify-center [&_svg]:max-h-none [&_svg]:max-w-none" />
    </div>
  );
}
