import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { isTransparentBgColor } from "@/lib/qrBgColor";
import type { QrStyleConfig } from "@/lib/qrCodeStyle";
import type { QrShapeInnerFragments } from "@/lib/qrShapeMarkup";
import { renderQrSvgString } from "@/lib/qrSvgRender";

export interface QrStylingPreviewProps {
  value: string;
  size: number;
  fgColor: string;
  bgColor: string;
  level: "L" | "M" | "Q" | "H";
  logoUrl?: string;
  style: QrStyleConfig;
  /** Fragments issus du catalogue `qr_shape_library` ; `null` tant que le catalogue charge. */
  shapeInnerFragments: QrShapeInnerFragments | null;
  className?: string;
}

/**
 * Aperçu QR : rendu SVG avec formes depuis `qr_shape_library`.
 */
export function QrStylingPreview({
  value,
  size,
  fgColor,
  bgColor,
  level,
  logoUrl,
  style,
  shapeInnerFragments,
  className,
}: QrStylingPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (!shapeInnerFragments) {
      el.innerHTML = "";
      return;
    }
    try {
      const svg = renderQrSvgString({
        value,
        size,
        fgColor,
        bgColor,
        level,
        style,
        logoUrl,
        shapeInnerFragments,
      });
      el.innerHTML = svg;
    } catch {
      el.innerHTML = "";
    }
  }, [
    value,
    size,
    fgColor,
    bgColor,
    level,
    logoUrl,
    style.dotShapeId,
    style.cornerOuterShapeId,
    style.cornerInnerShapeId,
    style.coverShapeId,
    style.frame,
    style.dotsRoundSize,
    style.encodeTrackingLink,
    JSON.stringify(style.partColors),
    shapeInnerFragments,
  ]);

  const showChecker = style.frame !== "card" && isTransparentBgColor(bgColor);

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
      <div ref={hostRef} className="flex min-h-[120px] min-w-[120px] items-center justify-center [&_svg]:max-h-none [&_svg]:max-w-none" />
    </div>
  );
}
