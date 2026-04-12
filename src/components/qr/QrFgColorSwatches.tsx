import { cn } from "@/lib/utils";
import { QR_FG_COLOR_PRESETS } from "@/lib/qrFgColorPresets";

interface QrFgColorSwatchesProps {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
  /** Pastilles plus petites (lignes denses). */
  compact?: boolean;
}

/**
 * Une ligne de pastilles : clic applique la couleur d’avant-plan des modules du QR.
 */
export function QrFgColorSwatches({ value, onChange, className, compact }: QrFgColorSwatchesProps) {
  const norm = value.trim().toLowerCase();
  return (
    <div
      className={cn("flex flex-wrap items-center", compact ? "gap-1" : "gap-1.5", className)}
      role="list"
      aria-label="Couleurs rapides"
    >
      {QR_FG_COLOR_PRESETS.map((hex) => {
        const active = norm === hex.toLowerCase();
        const light =
          hex.toLowerCase() === "#ffffff" ||
          hex.toLowerCase() === "#ffeb3b" ||
          hex.toLowerCase() === "#cddc39";
        return (
          <button
            key={hex}
            type="button"
            role="listitem"
            title={hex}
            aria-label={`Couleur ${hex}`}
            aria-pressed={active}
            onClick={() => onChange(hex)}
            className={cn(
              "shrink-0 rounded-lg border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              compact ? "h-6 w-6" : "h-8 w-8 rounded-xl",
              active ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:ring-1 hover:ring-border",
              light && !active && "ring-1 ring-border/70",
            )}
            style={{ backgroundColor: hex }}
          />
        );
      })}
    </div>
  );
}
