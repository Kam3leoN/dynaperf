import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

/** Fond type Discord — panneau, flèche et remplissage SVG alignés. */
const DISCORD_TOOLTIP_BG = "#1e1f22";

/**
 * Flèche : débord sur le plat ; pointe un peu plus marquée que l’arc large d’origine,
 * tout en gardant une seule quadratique (pas de pointe « piquante »).
 */
function TooltipArrowRounded(props: React.ComponentPropsWithoutRef<"svg">) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="-2 -1 34 12"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("block shrink-0 [shape-rendering:geometricPrecision]", className)}
      {...rest}
    >
      <path
        fill={DISCORD_TOOLTIP_BG}
        d="M-2 -1 H32 L32 0 L23.45 3.68 Q15 9.12 6.55 3.68 L-2 0 Z"
      />
    </svg>
  );
}

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, children, style, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        /* `className` d’abord : le bloc canonique ci‑dessous gagne aux conflits Tailwind (style unique partout). */
        className,
        "z-[200] overflow-visible rounded-[8px] border-0 px-3.5 py-2.5 text-[14px] font-semibold leading-snug text-white shadow-[0_8px_24px_rgba(0,0,0,0.42)] animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        /*
         * Radix enveloppe la flèche dans un <span> (mesure ResizeObserver) : cibler span > svg, pas svg direct.
         * Léger translate sur le SVG (le span a déjà transform inline) pour boucher le joint sous‑pixel.
         */
        "data-[side=top]:[&>span:last-child>svg]:-translate-y-px",
        "data-[side=bottom]:[&>span:last-child>svg]:translate-y-px",
        "data-[side=left]:[&>span:last-child>svg]:-translate-x-px",
        "data-[side=right]:[&>span:last-child>svg]:translate-x-px",
      )}
      style={{
        ...(style && typeof style === "object" ? style : {}),
        backgroundColor: DISCORD_TOOLTIP_BG,
      }}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow asChild width={18} height={9}>
        <TooltipArrowRounded width={18} height={9} />
      </TooltipPrimitive.Arrow>
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
