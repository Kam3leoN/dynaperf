import { cn } from "@/lib/utils";
import { QR_FG_COLOR_PRESETS } from "@/lib/qrFgColorPresets";

interface QrFgColorSwatchesProps {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}

/**
 * Une ligne de pastilles : clic applique la couleur d’avant-plan des modules du QR.
 */
export function QrFgColorSwatches({ value, onChange, className }: QrFgColorSwatchesProps) {
  const norm = value.trim().toLowerCase();
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="list" aria-label="Couleurs rapides pour les modules">
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
              "h-8 w-8 shrink-0 rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
