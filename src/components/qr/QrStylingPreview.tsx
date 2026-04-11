import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import { cn } from "@/lib/utils";
import { buildQrStylingOptions, type QrStyleConfig } from "@/lib/qrCodeStyle";

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
 * Aperçu QR basé sur **qr-code-styling** (points, coins, logo) — rendu SVG côté client.
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

    const opts = buildQrStylingOptions({
      value,
      size,
      fgColor,
      bgColor,
      level,
      logoUrl,
      style,
    });

    el.innerHTML = "";
    const qr = new QRCodeStyling(opts);
    qr.append(el);

    return () => {
      el.innerHTML = "";
    };
  }, [value, size, fgColor, bgColor, level, logoUrl, style]);

  return (
    <div
      className={cn(
        "mx-auto w-fit rounded-lg bg-white p-2",
        style.frame === "card" && "rounded-2xl border border-border/50 bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div ref={hostRef} className="flex items-center justify-center [&_svg]:max-h-none [&_svg]:max-w-none" />
    </div>
  );
}
