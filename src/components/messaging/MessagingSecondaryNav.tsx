import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faHashtag, faUsers, faGripVertical, faXmark } from "@fortawesome/free-solid-svg-icons";
import {
  useMessagingSidebarHost,
  type MessagingDmConversationRow,
  type MessagingGroupRow,
} from "@/contexts/MessagingSidebarContext";
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
  canReorder: boolean;
  isDragging: boolean;
  isDropHover: boolean;
  onDragStart: (id: string) => void;
  onDragOverRow: (e: React.DragEvent, id: string) => void;
  onDropOnRow: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
}) {
  const hasUnread = unread > 0 && !active;

  return (
    <div
      className={cn(
        "relative flex w-full items-stretch gap-0.5 rounded-md transition-[background-color,box-shadow,opacity] duration-m3-standard-accelerate ease-m3-standard",
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
          "relative flex min-w-0 flex-1 items-center gap-1.5 overflow-visible rounded py-1.5 pl-2 pr-2 text-left transition-colors duration-m3-standard-accelerate ease-m3-standard",
          "outline-none focus-visible:outline-none focus-visible:ring-0",
          active ? "bg-primary/12" : "hover:bg-primary/[0.08]",
          isDropHover && !isDragging && !active && "hover:bg-primary/[0.09]",
        )}
      >
        {/* Style Discord : demi-pilule sur le bord gauche si non lus */}
        {hasUnread && (
          <span
            className="pointer-events-none absolute left-0 top-1/2 z-[1] h-[18px] w-[3px] -translate-y-1/2 rounded-r-full bg-foreground"
            aria-hidden
          />
        )}
        {icon === "salon" ? (
          <FontAwesomeIcon
            icon={faHashtag}
            className={cn(
              "inline-block h-3.5 w-3.5 shrink-0 border-0 leading-none [&>svg]:border-0",
              hasUnread
                ? "text-foreground/80"
                : active
                  ? "text-zinc-600 dark:text-zinc-300"
                  : "text-zinc-500 dark:text-zinc-400",
            )}
          />
        ) : (
          <div className="relative shrink-0">
            <Avatar className="h-8 w-8">
              {g.avatar_url && <AvatarImage src={g.avatar_url} />}
              <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
                <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-[15px] leading-snug",
              hasUnread && "font-semibold text-foreground",
              !hasUnread && active && "font-medium text-foreground",
              !hasUnread && !active && "font-medium text-zinc-500 dark:text-zinc-400",
            )}
          >
            {g.name}
          </p>
        </div>
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
}: {
  items: MessagingGroupRow[];
  kind: ChannelKind;
  target: { type: string; id: string } | null;
  setTarget: (t: { type: "group"; id: string }) => void;
  getGroupUnread: (groupId: string) => number;
  persistChannelOrder: (kind: ChannelKind, orderedIds: string[]) => Promise<void>;
  canManageSalons: boolean;
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

function DmConversationRow({
  row,
  active,
  onSelect,
  onDismiss,
}: {
  row: MessagingDmConversationRow;
  active: boolean;
  onSelect: () => void;
  onDismiss: () => void;
}) {
  const hasUnread = row.unread > 0 && !active;

  return (
    <div
      className={cn(
        "relative flex w-full min-w-0 items-center gap-0.5 rounded-md py-1.5 pl-2 pr-1 text-left transition-colors",
        active ? "bg-primary/12" : "hover:bg-primary/[0.08]",
        "outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
      )}
    >
      {hasUnread && (
        <span
          className="pointer-events-none absolute left-0 top-1/2 z-[1] h-[18px] w-[3px] -translate-y-1/2 rounded-r-full bg-foreground"
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-md py-0 pl-0 pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        )}
      >
        <div className="relative shrink-0">
          <Avatar className="h-8 w-8">
            {row.avatarUrl && <AvatarImage src={row.avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
              {row.displayName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-[15px] leading-snug",
              hasUnread && "font-semibold text-foreground",
              !hasUnread && active && "font-medium text-foreground",
              !hasUnread && !active && "font-medium text-zinc-500 dark:text-zinc-400",
            )}
          >
            {row.displayName}
          </p>
        </div>
        {row.unread > 0 && (
          <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
            {row.unread > 99 ? "99+" : row.unread}
          </span>
        )}
      </button>
      <button
        type="button"
        data-dismiss-dm
        title="Retirer de votre liste"
        aria-label="Retirer cette conversation de votre liste"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Colonne gauche : mode Discussions (salons + groupes) ou Messages privés (historique MP).
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
    messagingSection,
    setMessagingSection,
    dmConversations,
    hideDmPartner,
  } = api;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1 border-b border-border/50 p-2">
        <Button
          type="button"
          variant={messagingSection === "discussion" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 flex-1 text-xs font-semibold"
          onClick={() => setMessagingSection("discussion")}
        >
          Discussions
        </Button>
        <Button
          type="button"
          variant={messagingSection === "messagerie" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 flex-1 text-xs font-semibold"
          onClick={() => setMessagingSection("messagerie")}
        >
          Messages privés
        </Button>
      </div>

      {messagingSection === "messagerie" ? (
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-2 pb-4">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Conversations
            </p>
            {dmConversations.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm leading-relaxed text-muted-foreground">
                Aucun message privé pour l’instant. Écrivez à un membre depuis l’annuaire à droite.
              </p>
            ) : (
              <div className="space-y-0.5">
                {dmConversations.map((row) => (
                  <DmConversationRow
                    key={row.userId}
                    row={row}
                    active={target?.type === "user" && target.id === row.userId}
                    onSelect={() => setTarget({ type: "user", id: row.userId })}
                    onDismiss={() => void hideDmPartner(row.userId)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        <>
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
              Aucun groupe. Pour les MP, passez par l’onglet « Messages privés » ou l’annuaire à droite.
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
            />
          )}
        </div>
      </ScrollArea>
        </>
      )}
    </div>
  );
}
