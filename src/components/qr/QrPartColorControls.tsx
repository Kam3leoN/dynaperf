import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { QrFgColorSwatches } from "@/components/qr/QrFgColorSwatches";
import { resolveQrPartColors, type QrPartColors, type QrStyleConfig } from "@/lib/qrCodeStyle";
import { cn } from "@/lib/utils";

/** `dots` : modules uniquement · `corners` : repères ext. + centre œil · `all` : les trois zones (onglets). */
export type QrPartColorScope = "dots" | "corners" | "all";

interface QrPartColorControlsProps {
  fgFallback: string;
  qrStyle: QrStyleConfig;
  /** Couleurs fusionnées (écrit dans `qr_style.partColors` + `fgColor` ← `dots`) */
  onUpdate: (merged: QrPartColors) => void;
  /** Par défaut : les trois zones avec sélecteur. */
  scope?: QrPartColorScope;
}

type ColorPart = "dots" | "outer" | "inner";

const PARTS_ALL: { id: ColorPart; label: string; hint: string }[] = [
  { id: "dots", label: "Modules", hint: "Points de données (dégradé possible)" },
  { id: "outer", label: "Repères ext.", hint: "Cadre des trois coins" },
  { id: "inner", label: "Centre œil", hint: "Intérieur des repères" },
];

const PARTS_CORNERS: { id: ColorPart; label: string; hint: string }[] = [
  { id: "outer", label: "Bordure des coins", hint: "Contour des trois repères" },
  { id: "inner", label: "Rond central", hint: "Centre des yeux" },
];

/**
 * Couleurs par zone : un seul jeu de pastilles + pipette à la fois (UX allégée).
 */
export function QrPartColorControls({ fgFallback, qrStyle, onUpdate, scope = "all" }: QrPartColorControlsProps) {
  const pc = resolveQrPartColors(fgFallback, qrStyle);
  const partList = scope === "corners" ? PARTS_CORNERS : PARTS_ALL;
  const [part, setPart] = useState<ColorPart>(scope === "corners" ? "outer" : "dots");

  const patch = (p: Partial<QrPartColors>) => {
    onUpdate({ ...pc, ...p });
  };

  const currentHex = part === "dots" ? pc.dots : part === "outer" ? pc.outer : pc.inner;

  const showTabs = scope !== "dots";

  return (
    <div className="space-y-4">
      {showTabs ? (
        <>
          <div
            className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/15 p-1.5 sm:flex-row sm:items-stretch"
            role="tablist"
            aria-label="Zone à colorer"
          >
            {partList.map(({ id, label, hint }) => {
              const active = part === id;
              const preview =
                id === "dots" ? pc.dots : id === "outer" ? pc.outer : pc.inner;
              return (
                <Button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-auto flex-1 flex-col gap-1 py-2.5 text-left font-medium",
                    active && "shadow-sm ring-1 ring-border/60",
                  )}
                  onClick={() => setPart(id)}
                  title={hint}
                >
                  <span className="flex w-full items-center gap-2">
                    <span
                      className="h-5 w-5 shrink-0 rounded-md border border-border/80 shadow-inner"
                      style={{ backgroundColor: preview }}
                      aria-hidden
                    />
                    <span className="text-xs leading-tight">{label}</span>
                  </span>
                </Button>
              );
            })}
          </div>

          <p className="text-[11px] leading-snug text-muted-foreground">
            {partList.find((p) => p.id === part)?.hint}
          </p>
        </>
      ) : (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Couleur des modules et dégradé éventuel (diagonal sur tout le code).
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label className="text-xs text-muted-foreground">Nuancier</Label>
          <QrFgColorSwatches
            value={currentHex}
            onChange={(hex) => {
              if (part === "dots") patch({ dots: hex });
              else if (part === "outer") patch({ outer: hex });
              else patch({ inner: hex });
            }}
            compact
          />
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 sm:w-[7.5rem]">
          <Label className="text-xs text-muted-foreground">Précis</Label>
          <Input
            type="color"
            className="h-11 w-full min-w-0 cursor-pointer rounded-lg border border-border/60 p-1"
            value={currentHex}
            onChange={(e) => {
              const hex = e.target.value;
              if (part === "dots") patch({ dots: hex });
              else if (part === "outer") patch({ outer: hex });
              else patch({ inner: hex });
            }}
            aria-label={`Couleur précise — ${partList.find((p) => p.id === part)?.label ?? part}`}
          />
        </div>
      </div>

      {(scope === "dots" || part === "dots") ? (
        <div className="space-y-3 rounded-lg border border-border/40 bg-muted/10 px-3 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Switch
              id="qr-dots-gradient"
              checked={pc.dotsFill === "gradient"}
              onCheckedChange={(g) => patch({ dotsFill: g ? "gradient" : "solid" })}
            />
            <Label htmlFor="qr-dots-gradient" className="cursor-pointer text-sm font-normal leading-snug">
              Dégradé diagonal sur tout le code
            </Label>
          </div>
          {pc.dotsFill === "gradient" ? (
            <div className="space-y-2 border-t border-border/30 pt-3">
              <Label className="text-xs text-muted-foreground">Seconde couleur du dégradé</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <QrFgColorSwatches
                    value={pc.dotsGradientEnd}
                    onChange={(hex) => patch({ dotsGradientEnd: hex })}
                    compact
                  />
                </div>
                <Input
                  type="color"
                  className="h-11 w-full shrink-0 cursor-pointer rounded-lg border border-border/60 p-1 sm:w-[7.5rem]"
                  value={pc.dotsGradientEnd}
                  onChange={(e) => patch({ dotsGradientEnd: e.target.value })}
                  aria-label="Couleur fin de dégradé — points"
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
