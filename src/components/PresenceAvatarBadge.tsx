import { usePresenceStatusDefinitions } from "@/contexts/PresenceStatusDefinitionsContext";
import { cn } from "@/lib/utils";
import { PRESENCE_COLORS, avatarPresenceVisualKey, type UserPresenceRow } from "@/lib/presence";
import { preparePresenceSvgMarkup } from "@/lib/presenceSvg";

interface PresenceAvatarBadgeProps {
  presence: UserPresenceRow | null | undefined;
  className?: string;
}

export const PRESENCE_AVATAR_BADGE_PX = 14;

const BADGE_PX = PRESENCE_AVATAR_BADGE_PX;

/** Anneau « découpe » : même teinte que le fond app pour un gap net. */
const AVATAR_GAP_SHADOW = "drop-shadow(0 0 0 2px hsl(var(--background)))";

export function PresenceAvatarBadge({ presence, className }: PresenceAvatarBadgeProps) {
  const { defsByKey } = usePresenceStatusDefinitions();
  const key = avatarPresenceVisualKey(presence);

  if (key === null) return null;

  const def = defsByKey[key];
  if (def && !def.show_on_avatar) return null;

  const color = def?.fill_color ?? PRESENCE_COLORS[key];

  const inner = def?.svg_markup?.trim() ? preparePresenceSvgMarkup(def.svg_markup) : "";

  if (!inner) {
    return (
      <span
        className={cn(
          "absolute bottom-0 right-0 z-10 rounded-full box-border pointer-events-none",
          className,
        )}
        style={{
          width: BADGE_PX,
          height: BADGE_PX,
          backgroundColor: color,
          boxShadow: "0 0 0 2px hsl(var(--background))",
        }}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 z-10 pointer-events-none flex items-center justify-center",
        "[&_svg]:h-full [&_svg]:w-full [&_svg]:block",
        className,
      )}
      style={{
        width: BADGE_PX,
        height: BADGE_PX,
        color,
        filter: AVATAR_GAP_SHADOW,
      }}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
