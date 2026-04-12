import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { QrFgColorSwatches } from "@/components/qr/QrFgColorSwatches";
import { resolveQrPartColors, type QrPartColors, type QrStyleConfig } from "@/lib/qrCodeStyle";

interface QrPartColorControlsProps {
  fgFallback: string;
  qrStyle: QrStyleConfig;
  /** Couleurs fusionnées (écrit dans `qr_style.partColors` + `fgColor` ← `dots`) */
  onUpdate: (merged: QrPartColors) => void;
}

/**
 * Couleurs indépendantes : points (uni ou dégradé), coins extérieurs, coins intérieurs.
 */
export function QrPartColorControls({ fgFallback, qrStyle, onUpdate }: QrPartColorControlsProps) {
  const pc = resolveQrPartColors(fgFallback, qrStyle);

  const patch = (p: Partial<QrPartColors>) => {
    onUpdate({ ...pc, ...p });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-sm">Points (modules)</Label>
        <QrFgColorSwatches value={pc.dots} onChange={(hex) => patch({ dots: hex })} />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="color"
            className="h-10 w-[120px] shrink-0 cursor-pointer"
            value={pc.dots}
            onChange={(e) => patch({ dots: e.target.value })}
            aria-label="Couleur des points — sélecteur"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
          <Switch
            id="qr-dots-gradient"
            checked={pc.dotsFill === "gradient"}
            onCheckedChange={(g) => patch({ dotsFill: g ? "gradient" : "solid" })}
          />
          <Label htmlFor="qr-dots-gradient" className="cursor-pointer text-xs font-normal leading-snug">
            Dégradé sur les points (diagonal sur tout le QR)
          </Label>
        </div>
        {pc.dotsFill === "gradient" ? (
          <div className="space-y-2 border-l-2 border-primary/30 pl-3">
            <Label className="text-xs text-muted-foreground">Fin du dégradé</Label>
            <QrFgColorSwatches value={pc.dotsGradientEnd} onChange={(hex) => patch({ dotsGradientEnd: hex })} />
            <Input
              type="color"
              className="h-10 max-w-[120px] cursor-pointer"
              value={pc.dotsGradientEnd}
              onChange={(e) => patch({ dotsGradientEnd: e.target.value })}
              aria-label="Couleur fin de dégradé — points"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Coins extérieurs (repères)</Label>
        <QrFgColorSwatches value={pc.outer} onChange={(hex) => patch({ outer: hex })} />
        <Input
          type="color"
          className="h-10 max-w-[120px] cursor-pointer"
          value={pc.outer}
          onChange={(e) => patch({ outer: e.target.value })}
          aria-label="Couleur coins extérieurs"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Coins intérieurs (centre des yeux)</Label>
        <QrFgColorSwatches value={pc.inner} onChange={(hex) => patch({ inner: hex })} />
        <Input
          type="color"
          className="h-10 max-w-[120px] cursor-pointer"
          value={pc.inner}
          onChange={(e) => patch({ inner: e.target.value })}
          aria-label="Couleur coins intérieurs"
        />
      </div>
    </div>
  );
}
