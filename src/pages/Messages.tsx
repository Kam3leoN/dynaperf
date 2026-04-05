import { useState, useEffect, useCallback, useRef, useMemo, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComments, faArrowLeft, faCheck, faCheckDouble,
  faEllipsisVertical, faPen, faTrash, faPlus, faUsers, faUserPlus, faXmark, faChevronDown,
  faHashtag, faThumbtack, faFaceSmile,
} from "@fortawesome/free-solid-svg-icons";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMessagingSidebarHost } from "@/contexts/MessagingSidebarContext";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { PresenceAvatarBadge } from "@/components/PresenceAvatarBadge";
import type { UserPresenceRow } from "@/lib/presence";
import { presenceLabelFor } from "@/lib/presence";
import { messageComposerChromeClassName } from "@/lib/bottomBarChrome";
import { cn } from "@/lib/utils";

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
  group_id: string | null;
  group_send_id?: string | null;
  pinned_at?: string | null;
  pinned_by?: string | null;
}

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

/** Réactions rapides (barre survol) + palette étendue (popover). */
const MESSAGE_QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"] as const;
const MESSAGE_EXTRA_REACTIONS = ["🔥", "👀", "✅", "🙏", "💯", "🎉", "🤔", "👏", "⭐", "💀"];

function reactionSummaries(rows: MessageReaction[], viewerId: string | undefined) {
  const byEmoji = new Map<string, { count: number; iReacted: boolean }>();
  for (const r of rows) {
    const cur = byEmoji.get(r.emoji) ?? { count: 0, iReacted: false };
    cur.count += 1;
    if (viewerId && r.user_id === viewerId) cur.iReacted = true;
    byEmoji.set(r.emoji, cur);
  }
  return [...byEmoji.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .map(([emoji, v]) => ({ emoji, ...v }));
}

interface ConversationGroup {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
  kind: "group" | "salon";
  is_public: boolean;
}

interface GroupMember {
  group_id: string;
  user_id: string;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatMessageDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Aujourd'hui";
  if (isYesterday(d)) return "Hier";
  return format(d, "d MMMM yyyy", { locale: fr });
}

/** Une bulle par envoi de groupe : regroupe les lignes partageant group_send_id (ou repli legacy). */
function mergeGroupMessageRows(rows: Message[], viewerUserId: string): Message[] {
  if (rows.length === 0) return [];
  const byBatch = new Map<string, Message[]>();
  const legacy: Message[] = [];
  for (const m of rows) {
    if (m.group_send_id) {
      const arr = byBatch.get(m.group_send_id) ?? [];
      arr.push(m);
      byBatch.set(m.group_send_id, arr);
    } else {
      legacy.push(m);
    }
  }
  const merged: Message[] = [];
  for (const arr of byBatch.values()) {
    merged.push(arr.find((x) => x.recipient_id === viewerUserId) ?? arr[0]);
  }
  const legacyByKey = new Map<string, Message>();
  for (const m of legacy) {
    const sec = m.created_at.slice(0, 19);
    const key = `${m.sender_id}|${sec}|${m.content}`;
    const cur = legacyByKey.get(key);
    if (!cur || (m.recipient_id === viewerUserId && cur.recipient_id !== viewerUserId)) {
      legacyByKey.set(key, m);
    }
  }
  merged.push(...legacyByKey.values());
  return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function sortMessagesByTime(rows: Message[]): Message[] {
  return [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function buildGroupsWithMeta(
  list: ConversationGroup[],
  messages: Message[],
  viewerId: string | undefined,
): Array<ConversationGroup & { lastMsg?: Message | null }> {
  return list
    .map((g) => {
      const groupMsgs = messages.filter((m) => m.group_id === g.id);
      const collapsed =
        viewerId && !g.is_public ? mergeGroupMessageRows(groupMsgs, viewerId) : sortMessagesByTime(groupMsgs);
      const lastMsg = collapsed.at(-1);
      return { ...g, lastMsg };
    })
    .sort((a, b) => {
      if (!a.lastMsg && !b.lastMsg) return 0;
      if (!a.lastMsg) return 1;
      if (!b.lastMsg) return -1;
      return new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime();
    });
}

/**
 * Toutes les lignes DB du même envoi dans un groupe (une par destinataire).
 */
function siblingGroupSendRows(m: Message, all: Message[]): Message[] {
  if (!m.group_id) return [m];
  if (m.group_send_id) {
    return all.filter(
      (x) =>
        x.group_id === m.group_id &&
        x.sender_id === m.sender_id &&
        x.group_send_id === m.group_send_id,
    );
  }
  const sec = m.created_at.slice(0, 19);
  return all.filter(
    (x) =>
      x.group_id === m.group_id &&
      x.sender_id === m.sender_id &&
      !x.group_send_id &&
      x.content === m.content &&
      x.created_at.slice(0, 19) === sec,
  );
}

/**
 * Comportement type WhatsApp : l'expéditeur peut modifier / supprimer tant qu'aucune copie
 * n'a été lue par un destinataire (DM ou groupe).
 */
function canSenderEditOrDeleteUnread(m: Message, all: Message[]): boolean {
  const siblings = m.group_id ? siblingGroupSendRows(m, all) : [m];
  return siblings.length > 0 && siblings.every((row) => !row.read);
}

type ConversationTarget = { type: "user"; id: string } | { type: "group"; id: string };

interface MessagesDialogsProps {
  editingMsg: Message | null;
  setEditingMsg: (m: Message | null) => void;
  editContent: string;
  setEditContent: (v: string) => void;
  handleEditMsg: () => void | Promise<void>;
  deletingMsg: Message | null;
  setDeletingMsg: (m: Message | null) => void;
  handleDeleteMsg: () => void | Promise<void>;
  groupDialogOpen: boolean;
  setGroupDialogOpen: (open: boolean) => void;
  groupDialogMode: "group" | "salon";
  editingGroup: ConversationGroup | null;
  groupName: string;
  setGroupName: (v: string) => void;
  selectedMembers: string[];
  setSelectedMembers: Dispatch<SetStateAction<string[]>>;
  profiles: Profile[];
  saveGroup: () => void | Promise<void>;
  deleteGroupTarget: ConversationGroup | null;
  setDeleteGroupTarget: (g: ConversationGroup | null) => void;
  handleDeleteGroup: () => void | Promise<void>;
  membersDialogOpen: boolean;
  setMembersDialogOpen: (open: boolean) => void;
  target: ConversationTarget | null;
  groupMembers: GroupMember[];
  getProfileById: (id: string) => Profile | undefined;
  isGroupCreator: boolean;
  userId: string | undefined;
  loadData: () => void | Promise<void>;
}

/**
 * Composant de niveau module : si défini dans le corps de `Messages`, React le traiterait comme un nouveau type
 * à chaque rendu et remonterait les dialogs (perte de focus / une seule lettre dans les champs).
 */
function MessagesDialogs({
  editingMsg,
  setEditingMsg,
  editContent,
  setEditContent,
  handleEditMsg,
  deletingMsg,
  setDeletingMsg,
  handleDeleteMsg,
  groupDialogOpen,
  setGroupDialogOpen,
  groupDialogMode,
  editingGroup,
  groupName,
  setGroupName,
  selectedMembers,
  setSelectedMembers,
  profiles,
  saveGroup,
  deleteGroupTarget,
  setDeleteGroupTarget,
  handleDeleteGroup,
  membersDialogOpen,
  setMembersDialogOpen,
  target,
  groupMembers,
  getProfileById,
  isGroupCreator,
  userId,
  loadData,
}: MessagesDialogsProps) {
  return (
    <>
      <Dialog open={!!editingMsg} onOpenChange={(o) => !o && setEditingMsg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le message</DialogTitle></DialogHeader>
            <RichTextEditor
              value={editContent}
              onChange={setEditContent}
              rows={3}
              onEnterSubmit={() => {
                if (editContent.trim()) void handleEditMsg();
              }}
            />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMsg(null)}>Annuler</Button>
            <Button onClick={() => void handleEditMsg()} disabled={!editContent.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingMsg} onOpenChange={(o) => !o && setDeletingMsg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMsg?.group_id
                ? "Le message sera retiré pour tous les membres qui ne l'ont pas encore lu. Action irréversible."
                : "Visible uniquement si personne ne l'a encore lu. Cette action est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteMsg()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup
                ? editingGroup.is_public
                  ? "Modifier le salon"
                  : "Modifier le groupe"
                : groupDialogMode === "salon"
                  ? "Nouveau salon"
                  : "Nouveau groupe"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">
                {editingGroup?.is_public || (!editingGroup && groupDialogMode === "salon") ? "Nom du salon" : "Nom du groupe"}
              </Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={
                  editingGroup?.is_public || (!editingGroup && groupDialogMode === "salon") ? "Ex: annonces" : "Ex: Équipe commerciale"
                }
                onEnterSubmit={() => {
                  if (groupName.trim()) void saveGroup();
                }}
              />
            </div>
            {((!editingGroup && groupDialogMode === "group") || (editingGroup && !editingGroup.is_public)) && (
              <div>
                <Label className="text-xs">Membres</Label>
                <div className="max-h-48 overflow-y-auto border border-border rounded-md mt-1">
                  {profiles.map((p) => (
                    <label key={p.user_id} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 cursor-pointer">
                      <Checkbox
                        checked={selectedMembers.includes(p.user_id)}
                        onCheckedChange={(checked) => {
                          setSelectedMembers((prev) =>
                            checked ? [...prev, p.user_id] : prev.filter((id) => id !== p.user_id),
                          );
                        }}
                      />
                      <Avatar className="h-7 w-7">
                        {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(p.display_name || "U")}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{p.display_name || "Utilisateur"}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {groupDialogMode === "salon" && !editingGroup && (
              <p className="text-xs text-muted-foreground">Visible par tous les membres connectés à l’app.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => void saveGroup()} disabled={!groupName.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteGroupTarget} onOpenChange={(o) => !o && setDeleteGroupTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le groupe « {deleteGroupTarget?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>Tous les messages du groupe seront supprimés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteGroup()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Membres du groupe</DialogTitle></DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {target?.type === "group" && groupMembers
              .filter((gm) => gm.group_id === target.id)
              .map((gm) => {
                const p = getProfileById(gm.user_id);
                return (
                  <div key={gm.user_id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-secondary/50">
                    <Avatar className="h-8 w-8">
                      {p?.avatar_url && <AvatarImage src={p.avatar_url} />}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(p?.display_name || "U")}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1">{p?.display_name || "Utilisateur"}</span>
                    {gm.user_id === userId && <Badge variant="secondary" className="text-[10px]">Vous</Badge>}
                    {gm.user_id !== userId && isGroupCreator && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
                        await supabase.from("conversation_group_members").delete().eq("group_id", target.id).eq("user_id", gm.user_id);
                        toast.success("Membre retiré");
                        void loadData();
                      }}>
                        <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembersDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface MessagesInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sendDisabled: boolean;
}

/**
 * Composant de module : ne pas le définir dans `Messages`, sinon React remonte la barre à chaque
 * frappe (nouveau type de composant à chaque rendu du parent) → une lettre puis perte de focus.
 */
function MessagesInputBar({ value, onChange, onSend, sendDisabled }: MessagesInputBarProps) {
  const isMobile = useIsMobile();
  const editor = (
    <RichTextEditor
      value={value}
      onChange={onChange}
      placeholder="Écrivez un message… (Entrée pour envoyer, Maj+Entrée pour la ligne)"
      rows={1}
      minimal
      autoGrow
      className={cn(
        "w-full min-h-0 max-h-full flex-1 self-end rounded-none border-0 bg-transparent shadow-none ring-0 focus-within:ring-0 focus-within:ring-offset-0",
      )}
      onEnterSubmit={() => {
        if (!sendDisabled) onSend();
      }}
    />
  );

  /** Carte extensible (type Discord) : `min-h` dock + `max-h` + scroll dans l’éditeur. */
  const chrome = (
    <div className={messageComposerChromeClassName}>
      {editor}
    </div>
  );

  if (isMobile) {
    return (
      <div className="shrink-0 border-t-2 border-border/40 bg-background/80 px-3 py-2.5 backdrop-blur-md">
        {chrome}
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[42] p-2 pb-3 lg:left-[360px] lg:right-[260px]">
      <div className="pointer-events-auto w-full">{chrome}</div>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin(user);
  const canManageSalons = isAdmin;
  const isMobile = useIsMobile();
  const { setApi } = useMessagingSidebarHost();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [target, setTarget] = useState<ConversationTarget | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const markedReadRef = useRef<Set<string>>(new Set());

  // Edit/delete states
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingMsg, setDeletingMsg] = useState<Message | null>(null);

  // Group / salon CRUD
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupDialogMode, setGroupDialogMode] = useState<"group" | "salon">("group");
  const [editingGroup, setEditingGroup] = useState<ConversationGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<ConversationGroup | null>(null);

  // Members management
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [presenceByUser, setPresenceByUser] = useState<Record<string, UserPresenceRow>>({});

  const loadData = useCallback(async () => {
    if (!user) return;
    const [profilesRes, msgsRes, groupsRes, membersRes, presenceRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url"),
      supabase.from("messages").select("*").order("created_at", { ascending: true }),
      supabase.from("conversation_groups").select("*"),
      supabase.from("conversation_group_members").select("group_id, user_id"),
      supabase.from("user_presence").select("*"),
    ]);
    const allP = (profilesRes.data || []) as Profile[];
    setAllProfiles(allP);
    setProfiles(allP.filter((p: any) => p.user_id !== user.id));
    if (msgsRes.error) toast.error(msgsRes.error.message);
    if (msgsRes.data) {
      setMessages(sortMessagesByTime(msgsRes.data as Message[]));
      const ids = (msgsRes.data as Message[]).map((m) => m.id);
      if (ids.length > 0) {
        const rxRes = await supabase.from("message_reactions").select("*").in("message_id", ids);
        if (rxRes.error) {
          toast.error(`Réactions : ${rxRes.error.message}`, { id: "messages-reactions-load" });
          setReactions([]);
        } else {
          setReactions((rxRes.data || []) as MessageReaction[]);
        }
      } else {
        setReactions([]);
      }
    } else {
      setReactions([]);
    }
    if (groupsRes.error) {
      toast.error(`Salons et groupes : ${groupsRes.error.message}`, { id: "messages-groups-load" });
    } else if (groupsRes.data) {
      setGroups(
        (groupsRes.data as Record<string, unknown>[]).map((g) => ({
          ...(g as unknown as ConversationGroup),
          kind: (g.kind as string) === "salon" ? "salon" : "group",
          is_public: Boolean(g.is_public),
        })),
      );
    }
    if (membersRes.error) {
      toast.error(`Membres des groupes : ${membersRes.error.message}`, { id: "messages-members-load" });
    } else if (membersRes.data) {
      setGroupMembers(membersRes.data as any);
    }
    const pmap: Record<string, UserPresenceRow> = {};
    (presenceRes.data as UserPresenceRow[] | null)?.forEach((r) => {
      pmap[r.user_id] = r;
    });
    setPresenceByUser(pmap);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  /** Ouvre une conversation DM depuis l’annuaire (`/messages?dm=<user_id>`). */
  useEffect(() => {
    const dm = searchParams.get("dm");
    if (!dm || !user?.id) return;
    if (dm === user.id) {
      const next = new URLSearchParams(searchParams);
      next.delete("dm");
      setSearchParams(next, { replace: true });
      return;
    }
    const exists = allProfiles.some((p) => p.user_id === dm);
    if (!exists) return;
    setTarget({ type: "user", id: dm });
    const next = new URLSearchParams(searchParams);
    next.delete("dm");
    setSearchParams(next, { replace: true });
  }, [searchParams, allProfiles, user?.id, setSearchParams]);

  /** Premier salon public par défaut (style Discord #général). */
  useEffect(() => {
    if (groups.length === 0) return;
    const salons = groups
      .filter((g) => g.is_public && g.kind === "salon")
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (salons.length === 0) return;
    setTarget((t) => (t === null ? { type: "group", id: salons[0].id } : t));
  }, [groups]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const row = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return sortMessagesByTime([...prev, row]);
          });
        } else if (payload.eventType === "UPDATE") {
          const row = payload.new as Message;
          setMessages((prev) => {
            const i = prev.findIndex((m) => m.id === row.id);
            if (i === -1) return sortMessagesByTime([...prev, row]);
            const next = [...prev];
            next[i] = row;
            return next;
          });
        } else if (payload.eventType === "DELETE") {
          const oldId = (payload.old as { id?: string }).id;
          if (oldId) setMessages((prev) => prev.filter((m) => m.id !== oldId));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_groups" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_group_members" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        const row = payload.new as UserPresenceRow | undefined;
        if (row?.user_id) {
          setPresenceByUser((prev) => ({ ...prev, [row.user_id]: row }));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (payload) => {
        const row = payload.new as MessageReaction;
        setReactions((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
        const oldId = (payload.old as { id?: string }).id;
        if (oldId) setReactions((prev) => prev.filter((r) => r.id !== oldId));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  // Marquer comme lus (évite les requêtes en rafale ; lot par .in())
  useEffect(() => {
    if (!user || !target) return;
    if (target.type === "group") {
      const g = groups.find((x) => x.id === target.id);
      if (g?.is_public) return;
    }
    const unread = messages.filter(m => {
      if (target.type === "user") {
        return m.sender_id === target.id && m.recipient_id === user.id && !m.read && !m.group_id;
      }
      return m.group_id === target.id && m.sender_id !== user.id && !m.read;
    });
    const ids = unread.map((m) => m.id).filter((id) => !markedReadRef.current.has(id));
    if (ids.length === 0) return;
    ids.forEach((id) => markedReadRef.current.add(id));
    void supabase
      .from("messages")
      .update({ read: true })
      .in("id", ids)
      .then(({ error }) => {
        if (error) {
          ids.forEach((id) => markedReadRef.current.delete(id));
          toast.error(error.message);
        }
      });
  }, [target, messages, user, groups]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, target]);

  const rawConversation = messages.filter(m => {
    if (!target) return false;
    if (target.type === "user") {
      return !m.group_id && (
        (m.sender_id === user?.id && m.recipient_id === target.id) ||
        (m.sender_id === target.id && m.recipient_id === user?.id)
      );
    }
    return m.group_id === target.id;
  });
  const activeGroup =
    target?.type === "group" ? groups.find((g) => g.id === target.id) : undefined;
  const conversation =
    target?.type === "group" && user
      ? activeGroup?.is_public
        ? sortMessagesByTime(rawConversation)
        : mergeGroupMessageRows(rawConversation, user.id)
      : sortMessagesByTime(rawConversation);

  const getUnreadCount = (t: ConversationTarget) => {
    if (t.type === "group") {
      const g = groups.find((x) => x.id === t.id);
      if (g?.is_public) return 0;
    }
    return messages.filter(m => {
      if (t.type === "user") {
        return m.sender_id === t.id && m.recipient_id === user?.id && !m.read && !m.group_id;
      }
      return m.group_id === t.id && m.sender_id !== user?.id && !m.read;
    }).length;
  };

  const getProfileById = (id: string) => allProfiles.find(p => p.user_id === id);

  const reactionsByMessageId = useMemo(() => {
    const m: Record<string, MessageReaction[]> = {};
    for (const r of reactions) {
      (m[r.message_id] ??= []).push(r);
    }
    return m;
  }, [reactions]);

  const toggleMessageReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;
      const list = reactionsByMessageId[messageId] ?? [];
      const mine = list.find((x) => x.user_id === user.id && x.emoji === emoji);
      if (mine) {
        const { error } = await supabase.from("message_reactions").delete().eq("id", mine.id);
        if (error) toast.error(error.message);
      } else {
        const { error } = await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
        if (error) toast.error(error.message);
      }
    },
    [user, reactionsByMessageId],
  );

  const toggleMessagePin = useCallback(async (m: Message) => {
    const nextPinned = !m.pinned_at;
    const { error } = await supabase.rpc("set_message_pin_state", {
      p_message_id: m.id,
      p_pinned: nextPinned,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(nextPinned ? "Message épinglé" : "Épinglage retiré");
  }, []);

  const salonsWithMeta = useMemo(
    () => buildGroupsWithMeta(
      groups.filter((g) => g.is_public && g.kind === "salon"),
      messages,
      user?.id,
    ),
    [groups, messages, user?.id],
  );

  const privateGroupsWithMeta = useMemo(
    () => buildGroupsWithMeta(
      groups.filter((g) => !g.is_public && g.kind === "group"),
      messages,
      user?.id,
    ),
    [groups, messages, user?.id],
  );

  const mobileChannelsMeta = useMemo(
    () => [...salonsWithMeta, ...privateGroupsWithMeta].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [salonsWithMeta, privateGroupsWithMeta],
  );

  const getGroupUnreadStable = useCallback(
    (groupId: string) => getUnreadCount({ type: "group", id: groupId }),
    [messages, groups, user?.id],
  );

  const sendMessage = async () => {
    if (!newMsg.trim() || !target || !user) return;
    setSending(true);
    const content = newMsg.trim();
    try {
      if (target.type === "user") {
        const { error } = await supabase.from("messages").insert({
          sender_id: user.id,
          recipient_id: target.id,
          content,
        });
        if (error) throw error;
      } else {
        const grp = groups.find((g) => g.id === target.id);
        if (grp?.is_public) {
          const { error } = await supabase.from("messages").insert({
            sender_id: user.id,
            recipient_id: user.id,
            content,
            group_id: target.id,
          });
          if (error) throw error;
        } else {
          const groupSendId = crypto.randomUUID();
          const members = groupMembers.filter((gm) => gm.group_id === target.id && gm.user_id !== user.id);
          if (members.length === 0) {
            const { error } = await supabase.from("messages").insert({
              sender_id: user.id,
              recipient_id: user.id,
              content,
              group_id: target.id,
              group_send_id: groupSendId,
            });
            if (error) throw error;
          } else {
            const inserts = members.map((m) => ({
              sender_id: user.id,
              recipient_id: m.user_id,
              content,
              group_id: target.id,
              group_send_id: groupSendId,
            }));
            const { error } = await supabase.from("messages").insert(inserts);
            if (error) throw error;
          }
        }
      }
      setNewMsg("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Envoi impossible";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  // Edit message
  const handleEditMsg = async () => {
    if (!editingMsg || !editContent.trim() || !user) return;
    const content = editContent.trim();
    const rows = (editingMsg.group_id ? siblingGroupSendRows(editingMsg, messages) : [editingMsg]).filter(
      (r) => r.sender_id === user.id && !r.read,
    );
    if (rows.length === 0) {
      toast.error("Ce message ne peut plus être modifié.");
      setEditingMsg(null);
      return;
    }
    const ids = rows.map((r) => r.id);
    const { error } = await supabase.from("messages").update({ content }).in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingMsg(null);
    toast.success("Message modifié");
  };

  // Delete message (groupe : toutes les lignes non lues du même envoi)
  const handleDeleteMsg = async () => {
    if (!deletingMsg || !user) return;
    const rows = (deletingMsg.group_id ? siblingGroupSendRows(deletingMsg, messages) : [deletingMsg]).filter(
      (r) => r.sender_id === user.id && !r.read,
    );
    if (rows.length === 0) {
      toast.error("Ce message a déjà été lu ou ne peut plus être supprimé.");
      setDeletingMsg(null);
      return;
    }
    const ids = rows.map((r) => r.id);
    const { error } = await supabase.from("messages").delete().in("id", ids);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDeletingMsg(null);
    toast.success(ids.length > 1 ? "Message retiré pour tous les destinataires concernés." : "Message supprimé");
  };

  // Group CRUD
  const openNewGroup = useCallback(() => {
    setEditingGroup(null);
    setGroupName("");
    setSelectedMembers([]);
    setGroupDialogMode("group");
    setGroupDialogOpen(true);
  }, []);

  const openNewSalon = useCallback(() => {
    setEditingGroup(null);
    setGroupName("");
    setSelectedMembers([]);
    setGroupDialogMode("salon");
    setGroupDialogOpen(true);
  }, []);

  const messagingSidebarPayload = useMemo(
    () => ({
      salonsWithMeta,
      groupsWithMeta: privateGroupsWithMeta,
      target,
      setTarget,
      openNewGroup,
      openNewSalon,
      canManageSalons,
      getGroupUnread: getGroupUnreadStable,
    }),
    [
      salonsWithMeta,
      privateGroupsWithMeta,
      target,
      setTarget,
      openNewGroup,
      openNewSalon,
      canManageSalons,
      getGroupUnreadStable,
    ],
  );

  useEffect(() => {
    return () => {
      setApi(null);
    };
  }, [setApi]);

  useEffect(() => {
    if (isMobile) {
      setApi(null);
      return;
    }
    setApi(messagingSidebarPayload);
  }, [isMobile, messagingSidebarPayload, setApi]);

  const openEditGroup = (g: ConversationGroup) => {
    setEditingGroup(g);
    setGroupName(g.name);
    setGroupDialogMode(g.is_public ? "salon" : "group");
    setSelectedMembers(groupMembers.filter(gm => gm.group_id === g.id).map(gm => gm.user_id));
    setGroupDialogOpen(true);
  };

  const saveGroup = async () => {
    if (!groupName.trim() || !user) return;
    const isSalon = groupDialogMode === "salon" || Boolean(editingGroup?.is_public);
    if (isSalon && !canManageSalons) {
      toast.error("Seuls les administrateurs peuvent gérer les salons publics.");
      return;
    }
    if (editingGroup) {
      const { error: updErr } = await supabase
        .from("conversation_groups")
        .update({ name: groupName.trim() })
        .eq("id", editingGroup.id);
      if (updErr) {
        toast.error(updErr.message);
        return;
      }
      if (!editingGroup.is_public) {
        const currentMembers = groupMembers.filter((gm) => gm.group_id === editingGroup.id).map((gm) => gm.user_id);
        const toAdd = selectedMembers.filter((id) => !currentMembers.includes(id));
        const toRemove = currentMembers.filter((id) => !selectedMembers.includes(id) && id !== user.id);
        if (toRemove.length) {
          for (const uid of toRemove) {
            const { error: delM } = await supabase
              .from("conversation_group_members")
              .delete()
              .eq("group_id", editingGroup.id)
              .eq("user_id", uid);
            if (delM) {
              toast.error(delM.message);
              return;
            }
          }
        }
        if (toAdd.length) {
          const { error: insM } = await supabase
            .from("conversation_group_members")
            .insert(toAdd.map((uid) => ({ group_id: editingGroup.id, user_id: uid })));
          if (insM) {
            toast.error(insM.message);
            return;
          }
        }
      }
      toast.success(isSalon ? "Salon modifié" : "Groupe modifié");
    } else if (isSalon) {
      const { data: newSalon, error: salonErr } = await supabase
        .from("conversation_groups")
        .insert({
          name: groupName.trim(),
          created_by: user.id,
          kind: "salon",
          is_public: true,
        })
        .select()
        .single();
      if (salonErr) {
        toast.error(salonErr.message);
        return;
      }
      if (newSalon) toast.success("Salon créé");
    } else {
      const { data: newGroup, error: grpErr } = await supabase
        .from("conversation_groups")
        .insert({
          name: groupName.trim(),
          created_by: user.id,
          kind: "group",
          is_public: false,
        })
        .select()
        .single();
      if (grpErr) {
        toast.error(grpErr.message);
        return;
      }
      if (newGroup) {
        const membersToAdd = [...new Set([user.id, ...selectedMembers])];
        const { error: memErr } = await supabase.from("conversation_group_members").insert(
          membersToAdd.map((uid) => ({ group_id: newGroup.id, user_id: uid })),
        );
        if (memErr) {
          toast.error(memErr.message);
          return;
        }
      }
      toast.success("Groupe créé");
    }
    setGroupDialogOpen(false);
    await loadData();
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return;
    if (deleteGroupTarget.is_public && !canManageSalons) {
      toast.error("Seuls les administrateurs peuvent supprimer un salon.");
      setDeleteGroupTarget(null);
      return;
    }
    const { error } = await supabase.from("conversation_groups").delete().eq("id", deleteGroupTarget.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const removedId = deleteGroupTarget.id;
    setDeleteGroupTarget(null);
    if (target?.type === "group" && target.id === removedId) setTarget(null);
    toast.success(deleteGroupTarget.is_public ? "Salon supprimé" : "Groupe supprimé");
    await loadData();
  };

  const targetName = target?.type === "user"
    ? (getProfileById(target.id)?.display_name || "Utilisateur")
    : groups.find(g => g.id === target?.id)?.name || "Groupe";

  const targetAvatar = target?.type === "user"
    ? getProfileById(target.id)?.avatar_url
    : groups.find(g => g.id === target?.id)?.avatar_url;

  const isGroupCreator = target?.type === "group" && groups.find(g => g.id === target.id)?.created_by === user?.id;

  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  conversation.forEach(m => {
    const dateKey = format(new Date(m.created_at), "yyyy-MM-dd");
    const last = groupedMessages.at(-1);
    if (last?.date === dateKey) {
      last.msgs.push(m);
    } else {
      groupedMessages.push({ date: dateKey, msgs: [m] });
    }
  });

  /** Fil type Discord : compact, barre d’actions au survol, réactions et épinglage. */
  const MessageBubble = ({ m, i, group }: { m: Message; i: number; group: Message[] }) => {
    const isMine = m.sender_id === user?.id;
    const showHeader = i === 0 || group[i - 1].sender_id !== m.sender_id;
    const canEditOrDelete = isMine && canSenderEditOrDeleteUnread(m, messages);
    const sender = getProfileById(m.sender_id);
    const displayName = sender?.display_name?.trim() || (isMine ? "Moi" : "Utilisateur");
    const avatarUrl = sender?.avatar_url;
    const msgReactions = reactionsByMessageId[m.id] ?? [];
    const summaries = reactionSummaries(msgReactions, user?.id);

    return (
      <div
        className={cn(
          "group/msg relative flex gap-3 px-4 pr-28",
          showHeader ? "mt-[15px]" : "mt-[2px]",
          "rounded-[4px] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
        )}
      >
        <div className="flex w-10 shrink-0 justify-center">
          {showHeader ? (
            <Avatar className="mt-0.5 h-10 w-10">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex w-full justify-end pr-0.5 pt-1">
              <time
                className="text-[10px] font-medium tabular-nums leading-none text-muted-foreground opacity-0 transition-opacity group-hover/msg:opacity-100 dark:text-[#949ba4]"
                dateTime={m.created_at}
              >
                {format(new Date(m.created_at), "HH:mm")}
              </time>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pb-0.5">
          {showHeader && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <span
                className={cn(
                  "text-[15px] font-semibold leading-tight",
                  isMine ? "text-primary" : "text-foreground dark:text-[#f2f3f5]",
                )}
              >
                {displayName}
              </span>
              <time
                className="text-[11px] font-medium leading-none text-muted-foreground dark:text-[#949ba4]"
                dateTime={m.created_at}
              >
                {format(new Date(m.created_at), "Pp", { locale: fr })}
              </time>
            </div>
          )}
          {m.pinned_at && (
            <div className="mb-1 mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <FontAwesomeIcon icon={faThumbtack} className="h-3 w-3" aria-hidden />
              Épinglé
            </div>
          )}
          <div className={cn("flex items-end gap-2", showHeader ? "mt-0.5" : "")}>
            <div
              className={cn(
                "min-w-0 flex-1 whitespace-pre-wrap break-words",
                "text-[15px] leading-[1.22] text-foreground dark:text-[#dbdee1]",
                "[&_a]:underline [&_a]:text-blue-600 dark:[&_a]:text-[#00a8fc]",
                "[&_p]:my-0 [&_p]:text-[15px] [&_p]:leading-[1.22]",
                "[&_p+p]:mt-1.5 [&_li]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_ul]:list-inside [&_ol]:list-inside",
              )}
              dangerouslySetInnerHTML={{ __html: m.content }}
            />
            {isMine && !m.group_id && (
              <span className="inline-flex shrink-0 pb-0.5" title={m.read ? "Lu" : "Envoyé"}>
                <FontAwesomeIcon
                  icon={m.read ? faCheckDouble : faCheck}
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground dark:text-[#949ba4]",
                    m.read && "text-sky-500 dark:text-sky-400",
                  )}
                />
              </span>
            )}
          </div>
          {summaries.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {summaries.map(({ emoji, count, iReacted }) => (
                <button
                  key={emoji}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                    "border-border/80 bg-background/60 hover:bg-muted/80 dark:border-white/15 dark:bg-[#2b2d31]/90",
                    iReacted && "border-primary/50 bg-primary/15 dark:border-primary/40",
                  )}
                  onClick={() => void toggleMessageReaction(m.id, emoji)}
                >
                  <span aria-hidden>{emoji}</span>
                  <span className="min-w-[1ch] tabular-nums text-muted-foreground dark:text-[#b5bac1]">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={cn(
            "absolute right-2 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100",
            showHeader ? "top-0.5" : "top-0",
          )}
        >
          <div className="flex items-center rounded-md border border-border/70 bg-background/98 py-0.5 pl-0.5 pr-0.5 shadow-md dark:border-white/12 dark:bg-[#111214]/95">
            {MESSAGE_QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded text-[15px] hover:bg-black/10 dark:hover:bg-white/10"
                aria-label={`Réagir ${emoji}`}
                onClick={() => void toggleMessageReaction(m.id, emoji)}
              >
                {emoji}
              </button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10"
                  aria-label="Autres réactions"
                >
                  <FontAwesomeIcon icon={faFaceSmile} className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-auto min-w-[unset] border-border/80 p-2 dark:border-white/10 dark:bg-[#2b2d31]"
                align="end"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="grid grid-cols-5 gap-1">
                  {MESSAGE_EXTRA_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-md text-lg hover:bg-black/10 dark:hover:bg-white/10"
                      onClick={() => void toggleMessageReaction(m.id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10",
                m.pinned_at && "text-amber-500 dark:text-amber-400",
              )}
              title={m.pinned_at ? "Désépingler" : "Épingler"}
              aria-label={m.pinned_at ? "Désépingler le message" : "Épingler le message"}
              onClick={() => void toggleMessagePin(m)}
            >
              <FontAwesomeIcon icon={faThumbtack} className="h-3.5 w-3.5" />
            </button>
            {canEditOrDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10"
                    aria-label="Plus d’actions"
                  >
                    <FontAwesomeIcon icon={faEllipsisVertical} className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingMsg(m);
                      setEditContent(m.content);
                    }}
                  >
                    <FontAwesomeIcon icon={faPen} className="mr-2 h-3 w-3" /> Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeletingMsg(m)}>
                    <FontAwesomeIcon icon={faTrash} className="mr-2 h-3 w-3" /> Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ConversationHeader = ({ onBack }: { onBack?: () => void }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-background shrink-0">
      {onBack && (
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
        </button>
      )}
      {target?.type === "user" ? (
        <div className="relative h-9 w-9 shrink-0">
          <Avatar className="h-9 w-9">
            {targetAvatar && <AvatarImage src={targetAvatar} />}
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
              {getInitials(targetName)}
            </AvatarFallback>
          </Avatar>
          <PresenceAvatarBadge presence={presenceByUser[target.id]} className="scale-90" />
        </div>
      ) : activeGroup?.is_public ? (
        <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/80 flex items-center justify-center text-muted-foreground">
          <FontAwesomeIcon icon={faHashtag} className="h-4 w-4" />
        </div>
      ) : (
        <Avatar className="h-9 w-9 shrink-0">
          {targetAvatar && <AvatarImage src={targetAvatar} />}
          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
            <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-foreground truncate">{targetName}</p>
        {target?.type === "user" && (
          <p className="text-xs text-muted-foreground">{presenceLabelFor(presenceByUser[target.id])}</p>
        )}
        {target?.type === "group" && activeGroup?.is_public && (
          <p className="text-xs text-muted-foreground">Salon public · {allProfiles.length} membres</p>
        )}
        {target?.type === "group" && !activeGroup?.is_public && (
          <p className="text-xs text-muted-foreground">
            {groupMembers.filter(gm => gm.group_id === target.id).length} membres
          </p>
        )}
      </div>
      {target?.type === "group" && activeGroup?.is_public && canManageSalons && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <FontAwesomeIcon icon={faEllipsisVertical} className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditGroup(groups.find((g) => g.id === target.id)!)}>
              <FontAwesomeIcon icon={faPen} className="h-3 w-3 mr-2" /> Modifier le salon
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteGroupTarget(groups.find((g) => g.id === target.id)!)}
            >
              <FontAwesomeIcon icon={faTrash} className="h-3 w-3 mr-2" /> Supprimer le salon
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {target?.type === "group" && isGroupCreator && !activeGroup?.is_public && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <FontAwesomeIcon icon={faEllipsisVertical} className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditGroup(groups.find(g => g.id === target.id)!)}>
              <FontAwesomeIcon icon={faPen} className="h-3 w-3 mr-2" /> Modifier le groupe
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMembersDialogOpen(true)}>
              <FontAwesomeIcon icon={faUserPlus} className="h-3 w-3 mr-2" /> Gérer les membres
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteGroupTarget(groups.find((g) => g.id === target.id)!)}
            >
              <FontAwesomeIcon icon={faTrash} className="h-3 w-3 mr-2" /> Supprimer le groupe
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  const MessagesArea = () => (
    <div
      ref={scrollRef}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto py-2",
        "bg-[#ebecef] dark:bg-[#313338]",
        "pb-4 lg:pb-[min(48vh,18rem)]",
      )}
    >
      {groupedMessages.length === 0 && (
        <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <FontAwesomeIcon icon={faComments} className="h-7 w-7 text-primary/40" />
          </div>
          <p className="text-[15px] text-muted-foreground dark:text-[#949ba4]">Démarrez la conversation…</p>
        </div>
      )}
      {groupedMessages.map((group) => (
        <div key={group.date}>
          <div className="my-4 flex items-center gap-3 px-4">
            <div className="h-px flex-1 bg-border dark:bg-white/[0.08]" />
            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground dark:text-[#949ba4]">
              {formatMessageDate(group.msgs[0].created_at)}
            </span>
            <div className="h-px flex-1 bg-border dark:bg-white/[0.08]" />
          </div>
          {group.msgs.map((m, i) => (
            <MessageBubble key={m.id} m={m} i={i} group={group.msgs} />
          ))}
        </div>
      ))}
    </div>
  );

  /** Salons + groupes sur mobile (les DM passent par l’annuaire). */
  const GroupsToolbar = () => (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/60 bg-background shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2 font-normal max-w-[min(100%,280px)]">
            {target?.type === "group" && groups.find((g) => g.id === target.id)?.is_public ? (
              <FontAwesomeIcon icon={faHashtag} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="truncate">
              {target?.type === "group"
                ? groups.find((g) => g.id === target.id)?.name ?? "Conversation"
                : "Salons & groupes"}
            </span>
            <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 opacity-50 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 max-h-[min(70vh,320px)] overflow-y-auto" align="start">
          {mobileChannelsMeta.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Aucun salon ni groupe.</p>
          ) : (
            mobileChannelsMeta.map((g) => {
              const unread = getUnreadCount({ type: "group", id: g.id });
              const active = target?.type === "group" && target.id === g.id;
              return (
                <DropdownMenuItem
                  key={g.id}
                  className={cn("flex items-center gap-3 cursor-pointer py-2.5", active && "bg-primary/10 focus:bg-primary/10")}
                  onClick={() => setTarget({ type: "group", id: g.id })}
                >
                  {g.is_public ? (
                    <div className="h-8 w-8 shrink-0 rounded-md bg-muted/80 flex items-center justify-center text-muted-foreground">
                      <FontAwesomeIcon icon={faHashtag} className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <Avatar className="h-8 w-8 shrink-0">
                      {g.avatar_url && <AvatarImage src={g.avatar_url} />}
                      <AvatarFallback className="bg-primary/15 text-primary text-[10px]">
                        <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    {g.lastMsg && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {format(new Date(g.lastMsg.created_at), "dd/MM · HH:mm")}
                      </p>
                    )}
                  </div>
                  {unread > 0 && (
                    <Badge className="h-5 min-w-[20px] rounded-full px-1.5 text-[10px] shrink-0">{unread}</Badge>
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {canManageSalons && (
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={openNewSalon} title="Nouveau salon">
          <FontAwesomeIcon icon={faHashtag} className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={openNewGroup} title="Nouveau groupe">
        <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const messagesMainClassName =
    "flex flex-col min-h-0 flex-1 !space-y-0 px-0 py-0 pb-28 lg:pb-0 lg:overflow-hidden lg:min-h-0";

  const messagesDialogs = (
    <MessagesDialogs
      editingMsg={editingMsg}
      setEditingMsg={setEditingMsg}
      editContent={editContent}
      setEditContent={setEditContent}
      handleEditMsg={handleEditMsg}
      deletingMsg={deletingMsg}
      setDeletingMsg={setDeletingMsg}
      handleDeleteMsg={handleDeleteMsg}
      groupDialogOpen={groupDialogOpen}
      setGroupDialogOpen={setGroupDialogOpen}
      groupDialogMode={groupDialogMode}
      editingGroup={editingGroup}
      groupName={groupName}
      setGroupName={setGroupName}
      selectedMembers={selectedMembers}
      setSelectedMembers={setSelectedMembers}
      profiles={profiles}
      saveGroup={saveGroup}
      deleteGroupTarget={deleteGroupTarget}
      setDeleteGroupTarget={setDeleteGroupTarget}
      handleDeleteGroup={handleDeleteGroup}
      membersDialogOpen={membersDialogOpen}
      setMembersDialogOpen={setMembersDialogOpen}
      target={target}
      groupMembers={groupMembers}
      getProfileById={getProfileById}
      isGroupCreator={isGroupCreator}
      userId={user?.id}
      loadData={loadData}
    />
  );

  // Mobile conversation view
  if (isMobile && target) {
    return (
      <AppLayout mainClassName={messagesMainClassName}>
        <div className="fixed inset-0 top-16 bottom-[68px] z-30 flex flex-col bg-background">
          <ConversationHeader onBack={() => setTarget(null)} />
          <MessagesArea />
          <MessagesInputBar
            value={newMsg}
            onChange={setNewMsg}
            onSend={() => void sendMessage()}
            sendDisabled={!newMsg.trim() || sending}
          />
        </div>
        {messagesDialogs}
      </AppLayout>
    );
  }

  return (
    <AppLayout mainClassName={messagesMainClassName}>
      <div className="flex flex-1 flex-col min-h-0 min-h-[calc(100dvh-4rem-1px)] lg:min-h-[calc(100dvh-4.25rem-1px)]">
        {isMobile && <GroupsToolbar />}
        {target ? (
          <>
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:overflow-hidden">
              <ConversationHeader />
              <MessagesArea />
            </div>
            <MessagesInputBar
              value={newMsg}
              onChange={setNewMsg}
              onSend={() => void sendMessage()}
              sendDisabled={!newMsg.trim() || sending}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-6 min-h-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <FontAwesomeIcon icon={faComments} className="h-9 w-9 text-primary/30" />
            </div>
            <p className="text-sm font-medium text-foreground">Messagerie</p>
            <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
              Sélectionnez un salon ou un groupe à gauche. Pour un message privé, choisissez un membre dans l’annuaire à droite (icône « Membres » sur mobile).
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {canManageSalons && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={openNewSalon}>
                  <FontAwesomeIcon icon={faHashtag} className="h-3 w-3" /> Nouveau salon
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openNewGroup}>
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Nouveau groupe
              </Button>
            </div>
          </div>
        )}
      </div>
      {messagesDialogs}
    </AppLayout>
  );
}
