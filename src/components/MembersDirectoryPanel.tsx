import { useAuth } from "@/hooks/useAuth";
import { useDirectoryMembers } from "@/hooks/useDirectoryMembers";
import { PRIMARY_ROLE_ORDER, PRIMARY_ROLE_SECTION_LABELS } from "@/lib/memberDirectory";
import { presenceLabelFor } from "@/lib/presence";
import { PresenceAvatarBadge } from "@/components/PresenceAvatarBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface MembersDirectoryPanelProps {
  className?: string;
  /** Appelé après navigation vers la messagerie (ex. fermer le sheet mobile). */
  onPickMember?: () => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Liste des membres groupés par rôle (style Discord), avec présence et accès rapide à la messagerie.
 */
export function MembersDirectoryPanel({ className, onPickMember }: MembersDirectoryPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { bySection, loading, error } = useDirectoryMembers(!!user);

  return (
    <div className={cn("flex flex-col min-h-0 h-full bg-muted/15", className)}>
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-1.5 pt-2 pb-4">
          {loading && <p className="text-xs text-muted-foreground px-2 py-3">Chargement…</p>}
          {error && (
            <p className="text-xs text-destructive px-2 py-3" role="alert">
              {error}
            </p>
          )}
          {!loading &&
            !error &&
            PRIMARY_ROLE_ORDER.map((roleKey) => {
              const list = bySection.get(roleKey) ?? [];
              if (list.length === 0) return null;
              return (
                <section key={roleKey} className="mb-3">
                  <h3 className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {PRIMARY_ROLE_SECTION_LABELS[roleKey]} — {list.length}
                  </h3>
                  <ul className="space-y-0.5">
                    {list.map((m) => (
                      <li key={m.userId}>
                        <button
                          type="button"
                          onClick={() => {
                            navigate(`/messages?dm=${encodeURIComponent(m.userId)}`);
                            onPickMember?.();
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                            "hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                            m.userId === user?.id && "bg-primary/5",
                          )}
                        >
                          <div className="relative h-9 w-9 shrink-0">
                            <div className="h-9 w-9 rounded-full overflow-hidden border border-border/80 bg-secondary/40 flex items-center justify-center">
                              {m.avatarUrl ? (
                                <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-semibold text-primary">{getInitials(m.displayName)}</span>
                              )}
                            </div>
                            <PresenceAvatarBadge presence={m.presence} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate leading-tight">{m.displayName}</p>
                            <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                              {m.title?.trim() || presenceLabelFor(m.presence)}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
