import { format } from "date-fns";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { ScrollArea } from "@/components/ui/scroll-area";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { faUsers, faPlus, faHashtag } from "@fortawesome/free-solid-svg-icons";

import { useMessagingSidebarHost } from "@/contexts/MessagingSidebarContext";

import { cn } from "@/lib/utils";



function ChannelRow({

  g,

  active,

  unread,

  onSelect,

  icon,

}: {

  g: { id: string; name: string; avatar_url: string | null; lastMsg?: { created_at: string } | null };

  active: boolean;

  unread: number;

  onSelect: () => void;

  icon: "salon" | "group";

}) {

  return (

    <button

      type="button"

      onClick={onSelect}

      className={cn(

        "w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",

        active ? "bg-primary/12" : "hover:bg-secondary/80",

      )}

    >

      {icon === "salon" ? (

        <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/80 flex items-center justify-center text-muted-foreground">

          <FontAwesomeIcon icon={faHashtag} className="h-4 w-4" />

        </div>

      ) : (

        <Avatar className="h-9 w-9 shrink-0">

          {g.avatar_url && <AvatarImage src={g.avatar_url} />}

          <AvatarFallback className="bg-primary/15 text-primary text-[10px]">

            <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />

          </AvatarFallback>

        </Avatar>

      )}

      <div className="flex-1 min-w-0">

        <p className="text-[15px] font-medium leading-snug truncate">{g.name}</p>

        {g.lastMsg && (

          <p className="text-xs text-muted-foreground truncate">

            {format(new Date(g.lastMsg.created_at), "dd/MM · HH:mm")}

          </p>

        )}

      </div>

      {unread > 0 && (

        <Badge className="h-5 min-w-[20px] rounded-full px-1.5 text-[11px] shrink-0">{unread}</Badge>

      )}

    </button>

  );

}



/**

 * Colonne messagerie : salons publics + groupes privés (DM via annuaire à droite).

 */

export function MessagingSecondaryNav() {

  const { api } = useMessagingSidebarHost();

  if (!api) {

    return <div className="px-3 py-8 text-center text-sm text-muted-foreground">Chargement…</div>;

  }

  const {

    salonsWithMeta,

    groupsWithMeta,

    target,

    setTarget,

    openNewGroup,

    openNewSalon,

    canManageSalons,

    getGroupUnread,

  } = api;



  return (

    <div className="flex flex-col min-h-0 flex-1">

      <div className="px-3 py-2 flex items-center justify-between gap-2 shrink-0">

        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Salons</p>

        {canManageSalons ? (

          <Button

            variant="outline"

            size="icon"

            className="h-8 w-8 shrink-0"

            onClick={openNewSalon}

            title="Nouveau salon"

          >

            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />

          </Button>

        ) : (

          <span className="h-8 w-8 shrink-0" aria-hidden />

        )}

      </div>

      <ScrollArea className="max-h-[40%] shrink-0">

        <div className="p-1.5 space-y-0.5 pb-3">

          {salonsWithMeta.length === 0 ? (

            <p className="text-sm text-muted-foreground px-2 py-3 text-center leading-relaxed">

              Aucun salon public.

            </p>

          ) : (

            salonsWithMeta.map((g) => (

              <ChannelRow

                key={g.id}

                g={g}

                icon="salon"

                unread={getGroupUnread(g.id)}

                active={target?.type === "group" && target.id === g.id}

                onSelect={() => setTarget({ type: "group", id: g.id })}

              />

            ))

          )}

        </div>

      </ScrollArea>



      <div className="px-3 py-2 flex items-center justify-between gap-2 shrink-0">

        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Groupes</p>

        <Button

          variant="outline"

          size="icon"

          className="h-8 w-8 shrink-0"

          onClick={openNewGroup}

          title="Nouveau groupe"

        >

          <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />

        </Button>

      </div>

      <ScrollArea className="flex-1 min-h-0">

        <div className="p-1.5 space-y-0.5 pb-4">

          {groupsWithMeta.length === 0 ? (

            <p className="text-sm text-muted-foreground px-2 py-4 text-center leading-relaxed">

              Aucun groupe. Les messages directs se lancent depuis l’annuaire à droite.

            </p>

          ) : (

            groupsWithMeta.map((g) => (

              <ChannelRow

                key={g.id}

                g={g}

                icon="group"

                unread={getGroupUnread(g.id)}

                active={target?.type === "group" && target.id === g.id}

                onSelect={() => setTarget({ type: "group", id: g.id })}

              />

            ))

          )}

        </div>

      </ScrollArea>

    </div>

  );

}

