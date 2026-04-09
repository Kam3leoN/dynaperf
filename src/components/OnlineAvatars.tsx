import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PresenceAvatarBadge } from "@/components/PresenceAvatarBadge";
import { effectivePresence, type UserPresenceRow } from "@/lib/presence";

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function OnlineAvatars() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [presenceByUser, setPresenceByUser] = useState<Record<string, UserPresenceRow>>({});

  useEffect(() => {
    const load = async () => {
      const [profilesRes, presenceRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, avatar_url"),
        supabase.from("user_presence" as any).select("*"),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      const map: Record<string, UserPresenceRow> = {};
      (presenceRes.data ?? []).forEach((r: any) => {
        map[r.user_id] = r as UserPresenceRow;
      });
      setPresenceByUser(map);
    };
    load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("online-avatars-presence")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as { user_id?: string }).user_id;
          if (!oldId) return;
          setPresenceByUser((prev) => {
            const next = { ...prev };
            delete next[oldId];
            return next;
          });
          return;
        }
        const row = payload.new as UserPresenceRow;
        if (!row?.user_id) return;
        setPresenceByUser((prev) => ({ ...prev, [row.user_id]: row }));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const onlineProfiles = profiles.filter(
    (p) => effectivePresence(presenceByUser[p.user_id]) !== "invisible",
  );

  if (onlineProfiles.length === 0) return null;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const maxVisible = 5;
  const visible = onlineProfiles.slice(0, maxVisible);
  const overflow = onlineProfiles.length - maxVisible;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center -space-x-2">
        {visible.map((p) => (
          <Tooltip key={p.user_id}>
            <TooltipTrigger asChild>
              <button type="button" className="relative cursor-default border-0 bg-transparent p-0">
                <Avatar className="h-[72px] w-[72px] border-2 border-card shrink-0">
                  {p.avatar_url ? (
                    <AvatarImage src={p.avatar_url} alt={p.display_name || ""} />
                  ) : null}
                  <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                    {getInitials(p.display_name)}
                  </AvatarFallback>
                </Avatar>
                <PresenceAvatarBadge
                  presence={presenceByUser[p.user_id]}
                  className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 border-2 border-card"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {p.display_name || "Utilisateur"}
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <Avatar className="h-[72px] w-[72px] border-2 border-card shrink-0">
            <AvatarFallback className="text-base font-semibold bg-muted text-muted-foreground">
              +{overflow}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </TooltipProvider>
  );
}
