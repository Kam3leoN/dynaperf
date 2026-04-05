import { useCallback, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faPlus, faHashtag, faGripVertical } from "@fortawesome/free-solid-svg-icons";
import { useMessagingSidebarHost, type MessagingGroupRow } from "@/contexts/MessagingSidebarContext";
import { cn } from "@/lib/utils";

type ChannelKind = "salon" | "group";

function reorderChannelIds(ids: string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from === -1 || to === -1 || from === to) return ids;
  const next = [...ids];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

function ChannelRow({
  g,
  active,
  unread,
  onSelect,
  icon,
  viewerUserId,
  canReorder,
  isDragging,
  isDropHover,
  onDragStart,
  onDragOverRow,
  onDropOnRow,
  onDragEnd,
}: {
  g: MessagingGroupRow;
  active: boolean;
  unread: number;
  onSelect: () => void;
  icon: ChannelKind;
  viewerUserId: string | undefined;
  canReorder: boolean;
  isDragging: boolean;
  isDropHover: boolean;
  onDragStart: (id: string) => void;
  onDragOverRow: (e: React.DragEvent, id: string) => void;
  onDropOnRow: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}) {
  const last = g.lastMsg;
  const showActivityDot = Boolean(
    last?.sender_id && viewerUserId && last.sender_id !== viewerUserId && !active,
  );

  return (
    <div
      className={cn(
        "relative flex w-full items-stretch gap-0.5 rounded-lg transition-[background-color,box-shadow,opacity] duration-150 ease-out",
        isDragging && "z-[1] opacity-[0.42] shadow-sm ring-1 ring-border/60",
        isDropHover && !isDragging && "bg-primary/[0.07] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.22)]",
      )}
      onDragOver={(e) => onDragOverRow(e, g.id)}
      onDrop={(e) => onDropOnRow(e, g.id)}
    >
      {canReorder ? (
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            /* Ne pas utiliser preventDefault sur mousedown ici : ça bloque le drag natif dans plusieurs navigateurs. */
            (e.currentTarget as HTMLButtonElement).blur();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", g.id);
            onDragStart(g.id);
          }}
          onDragEnd={onDragEnd}
          className={cn(
            "flex w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground",
            "hover:bg-muted/80 active:cursor-grabbing",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          )}
          title="Glisser pour réordonner"
          aria-label={`Réordonner ${g.name}`}
        >
          <FontAwesomeIcon icon={faGripVertical} className="h-3 w-3" />
        </button>
      ) : (
        <span className="w-2 shrink-0" aria-hidden />
      )}
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors duration-150",
          active ? "bg-primary/12" : "hover:bg-secondary/80",
          isDropHover && !isDragging && !active && "hover:bg-primary/[0.09]",
        )}
      >
        {icon === "salon" ? (
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
            <FontAwesomeIcon icon={faHashtag} className="h-4 w-4" />
            {showActivityDot && (
              <span
                className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
                title="Dernier message d’un autre membre"
                aria-hidden
              />
            )}
          </div>
        ) : (
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9">
              {g.avatar_url && <AvatarImage src={g.avatar_url} />}
              <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
                <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            {showActivityDot && (
              <span
                className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary"
                title="Dernier message d’un autre membre"
                aria-hidden
              />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium leading-snug">{g.name}</p>
          {g.lastMsg && (
            <p className="truncate text-xs text-muted-foreground">
              {format(new Date(g.lastMsg.created_at), "dd/MM · HH:mm")}
            </p>
          )}
        </div>
        {unread > 0 && (
          <Badge className="h-5 min-w-[20px] shrink-0 rounded-full px-1.5 text-[11px]">{unread}</Badge>
        )}
      </button>
    </div>
  );
}

function ChannelListBlock({
  items,
  kind,
  target,
  setTarget,
  getGroupUnread,
  persistChannelOrder,
  canManageSalons,
  viewerUserId,
}: {
  items: MessagingGroupRow[];
  kind: ChannelKind;
  target: { type: string; id: string } | null;
  setTarget: (t: { type: "group"; id: string }) => void;
  getGroupUnread: (groupId: string) => number;
  persistChannelOrder: (kind: ChannelKind, orderedIds: string[]) => Promise<void>;
  canManageSalons: boolean;
  viewerUserId: string | undefined;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const resetDragUi = useCallback(() => {
    setDraggingId(null);
    setOverId(null);
  }, []);

  const onDragOverRow = useCallback(
    (e: React.DragEvent, id: string) => {
      if (!canManageSalons || !draggingId) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      /* Ne jamais cibler la ligne qu’on traîne : sinon overId === draggingId → preview désactivée + FOUC. */
      if (id === draggingId) return;
      if (id !== overId) setOverId(id);
    },
    [canManageSalons, draggingId, overId],
  );

  const onDropOnRow = useCallback(
    (e: React.DragEvent, dropId: string) => {
      e.preventDefault();
      if (!canManageSalons || !draggingId) {
        resetDragUi();
        return;
      }
      const dragged = e.dataTransfer.getData("text/plain") || draggingId;
      const ids = items.map((x) => x.id);
      const next = reorderChannelIds(ids, dragged, dropId);
      resetDragUi();
      void persistChannelOrder(kind, next);
    },
    [canManageSalons, draggingId, items, kind, persistChannelOrder, resetDragUi],
  );

  const onDragEnd = useCallback(() => {
    resetDragUi();
  }, [resetDragUi]);

  const onListDragOver = useCallback(
    (e: React.DragEvent) => {
      if (canManageSalons && draggingId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }
    },
    [canManageSalons, draggingId],
  );

  return (
    <div
      className={cn("space-y-0.5 p-1.5", draggingId && "select-none")}
      onDragOver={onListDragOver}
    >
      {/*
        Ordre DOM stable pendant le drag : ne pas réordonner la liste en direct (preview),
        sinon le nœud qui porte `draggable` se déplace et le navigateur n’envoie souvent pas `drop`.
      */}
      {items.map((g) => {
        const isDragging = draggingId === g.id;
        const isDropHover = Boolean(draggingId && overId === g.id && draggingId !== g.id);
        return (
          <ChannelRow
            key={g.id}
            g={g}
            icon={kind}
            unread={getGroupUnread(g.id)}
            active={target?.type === "group" && target.id === g.id}
            onSelect={() => setTarget({ type: "group", id: g.id })}
            viewerUserId={viewerUserId}
            canReorder={canManageSalons}
            isDragging={isDragging}
            isDropHover={isDropHover}
            onDragStart={setDraggingId}
            onDragOverRow={onDragOverRow}
            onDropOnRow={onDropOnRow}
            onDragEnd={onDragEnd}
          />
        );
      })}
    </div>
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
    persistChannelOrder,
    viewerUserId,
  } = api;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
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
        <div className="pb-3">
          {salonsWithMeta.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm leading-relaxed text-muted-foreground">
              Aucun salon public.
            </p>
          ) : (
            <ChannelListBlock
              items={salonsWithMeta}
              kind="salon"
              target={target}
              setTarget={setTarget}
              getGroupUnread={getGroupUnread}
              persistChannelOrder={persistChannelOrder}
              canManageSalons={canManageSalons}
              viewerUserId={viewerUserId}
            />
          )}
        </div>
      </ScrollArea>

      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Groupes</p>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={openNewGroup} title="Nouveau groupe">
          <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="pb-4">
          {groupsWithMeta.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm leading-relaxed text-muted-foreground">
              Aucun groupe. Les messages directs se lancent depuis l’annuaire à droite.
            </p>
          ) : (
            <ChannelListBlock
              items={groupsWithMeta}
              kind="group"
              target={target}
              setTarget={setTarget}
              getGroupUnread={getGroupUnread}
              persistChannelOrder={persistChannelOrder}
              canManageSalons={canManageSalons}
              viewerUserId={viewerUserId}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
