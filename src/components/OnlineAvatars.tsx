import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function OnlineAvatars() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url");
      if (data) setProfiles(data);
    };
    load();
  }, []);

  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel("online-users", {
      config: { presence: { key: "user_id" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>();
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((p) => ids.add(p.user_id));
        });
        setOnlineIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({ user_id: user.id });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onlineProfiles = profiles.filter((p) => onlineIds.has(p.user_id));

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
                <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
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
