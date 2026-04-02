import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import type { UserStreak, EarnedBadge, Badge } from "@/hooks/useGamification";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const XP_PER_LEVEL = 200;

interface Props {
  streaks: UserStreak | null;
  earnedBadges: EarnedBadge[];
  allBadges: Badge[];
}

export function GamificationWidget({ streaks, earnedBadges, allBadges }: Props) {
  if (!streaks) return null;

  const xpInLevel = streaks.xp % XP_PER_LEVEL;
  const xpProgress = (xpInLevel / XP_PER_LEVEL) * 100;
  const earnedIds = new Set(earnedBadges.map((b) => b.id));

  return (
    <div className="space-y-4">
      {/* Level & XP */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary font-bold text-lg">
          {streaks.level}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">Niveau {streaks.level}</span>
            <span className="text-xs text-muted-foreground">{xpInLevel}/{XP_PER_LEVEL} XP</span>
          </div>
          <Progress value={xpProgress} className="h-2" />
        </div>
      </div>

      {/* Streak & stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-xl bg-muted/50">
          <p className="text-lg font-bold text-foreground">{streaks.current_streak}</p>
          <p className="text-[10px] text-muted-foreground">🔥 Streak</p>
        </div>
        <div className="text-center p-2 rounded-xl bg-muted/50">
          <p className="text-lg font-bold text-foreground">{streaks.total_audits}</p>
          <p className="text-[10px] text-muted-foreground">📋 Audits</p>
        </div>
        <div className="text-center p-2 rounded-xl bg-muted/50">
          <p className="text-lg font-bold text-foreground">{streaks.total_suivis}</p>
          <p className="text-[10px] text-muted-foreground">📊 Suivis</p>
        </div>
      </div>

      {/* Badges */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-2">Badges ({earnedBadges.length}/{allBadges.length})</p>
        <TooltipProvider>
          <div className="flex flex-wrap gap-1.5">
            {allBadges.map((badge) => {
              const earned = earnedIds.has(badge.id);
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-default transition-all ${
                        earned ? "bg-primary/10 shadow-sm" : "bg-muted/30 opacity-30 grayscale"
                      }`}
                    >
                      {badge.icon}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-semibold">{badge.label}</p>
                    <p className="text-muted-foreground">{badge.description}</p>
                    {!earned && <p className="text-primary text-[10px] mt-0.5">Non débloqué</p>}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
