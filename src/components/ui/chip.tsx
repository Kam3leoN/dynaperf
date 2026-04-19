import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Base commune **Material Design 3** (composant Chips) :
 * — Hauteur 32dp, coins 8dp (pas en pilule sauf cas spécifique)
 * — Label : corps petit / label large (~14sp, medium)
 * — Icône : 18dp, espacement 8dp entre éléments
 * — « Expressive » / Material You : surfaces et contours via tokens du thème
 *
 * @see https://m3.material.io/components/chips/specs
 */
const m3ChipRoot = cn(
  "inline-flex shrink-0 items-center justify-center gap-[var(--m3-chip-gap,8px)] whitespace-nowrap",
  "min-h-[var(--m3-chip-height,32px)] h-[var(--m3-chip-height,32px)]",
  "rounded-[var(--m3-chip-radius,8px)]",
  "px-[var(--m3-chip-padding-horizontal,16px)]",
  "text-sm font-medium leading-none tracking-tight",
  "border border-transparent transition-colors select-none",
  "[&_svg]:size-[var(--m3-chip-icon-size,18px)] [&_svg]:shrink-0",
);

/** Avec icône ou avatar : padding horizontal 8dp (spec M3). */
const m3ChipWithMedia = "px-[var(--m3-chip-padding-horizontal-with-icon,8px)]";

const chipVariants = cva(m3ChipRoot, {
  variants: {
    variant: {
      /** Assist / suggestion — surface légèrement relevée */
      elevated:
        "border-0 bg-surface-container text-foreground shadow-soft dark:bg-surface-container-high dark:shadow-none",
      /** Contour discret (outline variant), fond transparent — filtre / tag */
      outlined:
        "border border-outline-variant bg-transparent text-foreground shadow-none dark:border-outline-variant",
      /** Tonal (secondary container) */
      tonal: "border-0 bg-secondary text-secondary-foreground shadow-none",
      /** Rempli primaire (action forte) */
      filled: "border-0 bg-primary text-primary-foreground shadow-sm",
      /** États sémantiques (tonal containers) — alignés M3 error / success */
      success:
        "border-0 bg-emerald-500/[0.14] text-emerald-900 shadow-none dark:bg-emerald-500/15 dark:text-emerald-300",
      warning:
        "border-0 bg-amber-500/[0.14] text-amber-950 shadow-none dark:bg-amber-500/12 dark:text-amber-200",
      error: "border-0 bg-destructive/12 text-destructive shadow-none dark:bg-destructive/20 dark:text-destructive",
    },
    /** Filtre sélectionné (remplissage secondaire / primaire) */
    selected: {
      true: "",
      false: "",
    },
    /** Cible interactive (state layer M3 au survol) */
    interactive: {
      true: "cursor-pointer hover:brightness-[0.97] dark:hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      false: "focus-visible:outline-none",
    },
  },
  compoundVariants: [
    {
      variant: "outlined",
      selected: true,
      class:
        "border-primary/45 bg-primary/12 text-primary dark:border-primary/50 dark:bg-primary/18 dark:text-primary",
    },
    {
      variant: "tonal",
      selected: true,
      class: "bg-primary/18 text-primary dark:bg-primary/25",
    },
  ],
  defaultVariants: {
    variant: "elevated",
    selected: false,
    interactive: false,
  },
});

export type ChipVariants = VariantProps<typeof chipVariants>;

export interface ChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<ChipVariants, "interactive"> {
  /** Présence d’un média leading (icône / avatar) — ajuste le padding horizontal (8dp). */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  interactive?: boolean;
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({ className, variant, selected, interactive, leading, trailing, children, ...props }, ref) => {
    const hasMedia = Boolean(leading || trailing);
    return (
      <div
        ref={ref}
        data-slot="chip"
        className={cn(
          chipVariants({ variant, selected, interactive }),
          hasMedia && m3ChipWithMedia,
          className,
        )}
        {...props}
      >
        {leading}
        {children}
        {trailing}
      </div>
    );
  },
);
Chip.displayName = "Chip";

/** Rétrocompat `Badge` : mêmes mesures M3, variantes nommées comme l’ancien API. */
const badgeVariants = cva(m3ChipRoot, {
  variants: {
    variant: {
      default: "border-0 bg-primary text-primary-foreground shadow-sm",
      secondary: "border-0 bg-secondary text-secondary-foreground shadow-none",
      destructive: "border-0 bg-destructive text-destructive-foreground shadow-none",
      outline:
        "border border-outline-variant bg-surface-container/90 text-foreground shadow-none dark:bg-surface-container-high/80",
      tonal: "border-0 bg-primary/12 text-primary shadow-none dark:bg-primary/18",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => {
  return <div ref={ref} data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
});
Badge.displayName = "Badge";

export { Badge, badgeVariants, chipVariants, Chip, m3ChipRoot, m3ChipWithMedia };
