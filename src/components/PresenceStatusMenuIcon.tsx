import { usePresenceStatusDefinitions } from "@/contexts/PresenceStatusDefinitionsContext";
import { preparePresenceSvgMarkup } from "@/lib/presenceSvg";
import type { PresenceStatus } from "@/lib/presence";
import { PRESENCE_COLORS } from "@/lib/presence";
import { cn } from "@/lib/utils";

/** Pastille du menu profil (liste des statuts). */
export function PresenceStatusMenuIcon({
  status,
  className,
}: {
  status: PresenceStatus;
  className?: string;
}) {
  const { defsByKey } = usePresenceStatusDefinitions();

  if (status === "invisible") {
    const c = defsByKey.invisible?.fill_color ?? PRESENCE_COLORS.invisible;
    return (
      <span
        className={cn("mr-2.5 h-2.5 w-2.5 shrink-0 rounded-full box-border bg-transparent border-2", className)}
        style={{ borderColor: c }}
        aria-hidden
      />
    );
  }

  const def = defsByKey[status];
  const color = def?.fill_color ?? PRESENCE_COLORS[status];
  const inner = def?.svg_markup?.trim() ? preparePresenceSvgMarkup(def.svg_markup) : "";

  if (!inner) {
    return (
      <span
        className={cn("mr-2.5 h-2.5 w-2.5 shrink-0 rounded-full", className)}
        style={{ backgroundColor: color, boxShadow: "0 0 0 1px hsl(var(--background))" }}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn("mr-2.5 h-2.5 w-2.5 shrink-0 inline-block [&_svg]:h-full [&_svg]:w-full [&_svg]:block", className)}
      style={{
        color,
        filter: "drop-shadow(0 0 0 1px hsl(var(--background)))",
      }}
      dangerouslySetInnerHTML={{ __html: inner }}
      aria-hidden
    />
  );
}
