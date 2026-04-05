import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/presence";
import { PRESENCE_COLORS, effectivePresence, type UserPresenceRow } from "@/lib/presence";

interface PresenceAvatarBadgeProps {
  presence: UserPresenceRow | null | undefined;
  className?: string;
}

/** Anneau « découpe » : même teinte que le fond app (thème) pour créer un gap net sans contour blanc. */
const PRESENCE_BADGE_GAP = "0 0 0 2px hsl(var(--background))";

const BADGE_SIZE = 12;

export function PresenceAvatarBadge({ presence, className }: PresenceAvatarBadgeProps) {
  const s: PresenceStatus = effectivePresence(presence);
  const color = PRESENCE_COLORS[s];
  const isHollow = s === "invisible";
  const isDnd = s === "dnd";

  if (isDnd) {
    return (
      <span
        className={cn(
          "absolute bottom-0 right-0 z-10 rounded-full box-border pointer-events-none flex items-center justify-center",
          className,
        )}
        style={{
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          backgroundColor: color,
          boxShadow: PRESENCE_BADGE_GAP,
        }}
        aria-hidden
      >
        <span className="block w-[7px] h-[2px] bg-white rounded-full shrink-0" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 z-10 rounded-full box-border pointer-events-none",
        className,
      )}
      style={
        isHollow
          ? {
              width: BADGE_SIZE,
              height: BADGE_SIZE,
              backgroundColor: "transparent",
              border: `2px solid ${color}`,
              boxShadow: PRESENCE_BADGE_GAP,
            }
          : {
              width: BADGE_SIZE,
              height: BADGE_SIZE,
              backgroundColor: color,
              boxShadow: PRESENCE_BADGE_GAP,
            }
      }
      aria-hidden
    />
  );
}
