import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ACTION_ICON_TONE_PRESETS,
  actionIconToneStyle,
  type ActionIconToneMix,
  type ActionIconVariant,
} from "@/lib/actionIconTone";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export type { ActionIconToneMix, ActionIconVariant } from "@/lib/actionIconTone";
export {
  ACTION_ICON_TONE_PRESETS,
  DEFAULT_ACTION_ICON_MIX,
  actionIconToneStyle,
  actionIconToneStyleFromPreset,
} from "@/lib/actionIconTone";

function resolveActionIconToneStyle(
  variant: ActionIconVariant,
  tone?: string,
  toneMix?: Partial<ActionIconToneMix>,
): CSSProperties {
  const preset = ACTION_ICON_TONE_PRESETS[variant];
  const baseTone = tone ?? preset.tone;
  const baseMix: ActionIconToneMix = {
    bg: preset.bg,
    hover: preset.hover,
    bgDark: preset.bgDark,
    hoverDark: preset.hoverDark,
    ...toneMix,
  };
  return actionIconToneStyle(baseTone, baseMix);
}

export interface ActionIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  /** Texte du tooltip (et aria-label par défaut) */
  label: string;
  /** Préréglage métier (couleurs dans `ACTION_ICON_TONE_PRESETS`) */
  variant?: ActionIconVariant;
  /**
   * Couleur libre (hex, `hsl()`, etc.) — remplace la teinte du preset.
   * Les pourcentages de `color-mix` viennent du `variant` (ex. `view` = mêmes ratios que « Voir ») ;
   * pour les réinitialiser, passe `toneMix` ou choisis un `variant` proche (ex. `default`).
   */
  tone?: string;
  /** Affiner les % `color-mix` (clair / hover / dark / hover dark) */
  toneMix?: Partial<ActionIconToneMix>;
  children: ReactNode;
  /** Fusionne styles sur l’enfant (ex. `<Link>`) — un seul enfant requis. */
  asChild?: boolean;
  style?: ButtonHTMLAttributes<HTMLButtonElement>["style"];
}

/**
 * Bouton d’action carré (icône seule) avec tooltip — styles via la mixin `.action-icon-tone` + variables CSS.
 */
export function ActionIconButton({
  label,
  variant = "default",
  tone,
  toneMix,
  className,
  children,
  asChild = false,
  style,
  "aria-label": ariaLabel,
  ...props
}: ActionIconButtonProps) {
  const Comp = asChild ? Slot : "button";
  const toneStyle = resolveActionIconToneStyle(variant, tone, toneMix);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Comp
          {...(!asChild ? { type: "button" as const } : {})}
          aria-label={ariaLabel ?? label}
          style={{ ...toneStyle, ...style }}
          className={cn(
            "action-icon-tone",
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            "[&_svg]:text-current",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:opacity-50",
            className,
          )}
          {...props}
        >
          {children}
        </Comp>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
