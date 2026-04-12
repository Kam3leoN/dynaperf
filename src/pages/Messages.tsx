import { useState, useEffect, useCallback, useRef, useMemo, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { usePermissionGate } from "@/contexts/PermissionsContext";
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
  faComments, faCheck, faCheckDouble,
  faEllipsisVertical, faPen, faTrash, faPlus, faUserPlus, faXmark, faChevronDown,
  faHashtag,
  faUsers,
  faEnvelope,
  faThumbtack,
  faFaceSmile,
} from "@fortawesome/free-solid-svg-icons";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { useShellNarrow } from "@/contexts/ResponsiveShellContext";
import {
  useMessagingSidebarHost,
  type MessagingDmConversationRow,
  type MessagingSection,
} from "@/contexts/MessagingSidebarContext";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { PresenceAvatarBadge } from "@/components/PresenceAvatarBadge";
import type { UserPresenceRow } from "@/lib/presence";
import { usePresenceStatusDefinitions } from "@/contexts/PresenceStatusDefinitionsContext";
import { messageComposerChromeClassName } from "@/lib/bottomBarChrome";
import { cn } from "@/lib/utils";
import { ContextSubHeader } from "@/components/context-sub-header";

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

function twemojiUrl(emoji: string): string {
  const codepoints = Array.from(emoji)
    .filter((char) => char.codePointAt(0) !== 0xfe0f)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter((cp): cp is string => Boolean(cp))
    .join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
}

/** Aperçu texte brut pour la liste des messages épinglés (contenu riche HTML). */
function previewMessageContent(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
  }
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim().slice(0, 280);
}

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
  nav_sort_order?: number;
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
  return list.map((g) => {
    const groupMsgs = messages.filter((m) => m.group_id === g.id);
    const collapsed =
      viewerId && !g.is_public ? mergeGroupMessageRows(groupMsgs, viewerId) : sortMessagesByTime(groupMsgs);
    const lastMsg = collapsed.at(-1) ?? null;
    return { ...g, lastMsg };
  });
}

/** Ordre d’affichage stable (nav_sort_order) ; ne pas trier par dernière activité. */
function sortMessagingChannels<T extends { nav_sort_order?: number; name: string }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) =>
      (a.nav_sort_order ?? 0) - (b.nav_sort_order ?? 0) || a.name.localeCompare(b.name, "fr"),
  );
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
  const isMobile = useShellNarrow();
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
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[42] p-2 pb-3 shell:left-[376px] shell:right-[260px]">
      <div className="pointer-events-auto w-full">{chrome}</div>
    </div>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const { labelForRow } = usePresenceStatusDefinitions();
  const { isAdmin } = useAdmin(user);
  const { hasPermission } = usePermissionGate();
  const canManageSalons = hasPermission("messaging.manage_salons");
  const isMobile = useShellNarrow();
  const { setApi } = useMessagingSidebarHost();
  const [searchParams, setSearchParams] = useSearchParams();
  const messagingSection: MessagingSection =
    searchParams.get("section") === "messagerie" ? "messagerie" : "discussion";
  const pinnedView = searchParams.get("view") === "pinned";
  const setMessagingSection = useCallback(
    (s: MessagingSection) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("section", s);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [target, setTarget] = useState<ConversationTarget | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [deleteShortcutArmed, setDeleteShortcutArmed] = useState(false);
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
  const [hiddenDmPartnerIds, setHiddenDmPartnerIds] = useState<string[]>([]);
  const [dmHideAvailable, setDmHideAvailable] = useState(true);
  const hiddenDmPartnerIdsRef = useRef<Set<string>>(new Set());
  const unhideDmPartnerRef = useRef<(partnerId: string) => Promise<void>>(async () => {});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setDeleteShortcutArmed(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setDeleteShortcutArmed(false);
    };
    const onBlur = () => setDeleteShortcutArmed(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    hiddenDmPartnerIdsRef.current = new Set(hiddenDmPartnerIds);
  }, [hiddenDmPartnerIds]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [profilesRes, msgsRes, groupsRes, membersRes, presenceRes, hiddenRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url"),
      supabase.from("messages").select("*").order("created_at", { ascending: true }),
      supabase
        .from("conversation_groups")
        .select("*")
        .order("nav_sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("conversation_group_members").select("group_id, user_id"),
      (supabase as any).from("user_presence").select("*"),
      (supabase as any).from("user_dm_hidden_partners").select("partner_user_id").eq("user_id", user.id),
    ]);
    const allP = (profilesRes.data || []) as Profile[];
    setAllProfiles(allP);
    setProfiles(allP.filter((p) => p.user_id !== user.id));
    if (msgsRes.error) toast.error(msgsRes.error.message);
    if (msgsRes.data) {
      setMessages(sortMessagesByTime(msgsRes.data as Message[]));
      const ids = (msgsRes.data as Message[]).map((m) => m.id);
      if (ids.length > 0) {
        const rxRes = await (supabase as any).from("message_reactions").select("*").in("message_id", ids);
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
          nav_sort_order: typeof g.nav_sort_order === "number" ? g.nav_sort_order : 0,
        })),
      );
    }
    if (membersRes.error) {
      toast.error(`Membres des groupes : ${membersRes.error.message}`, { id: "messages-members-load" });
    } else if (membersRes.data) {
      setGroupMembers(membersRes.data as GroupMember[]);
    }
    const pmap: Record<string, UserPresenceRow> = {};
    ((presenceRes.data as any[]) ?? []).forEach((r: any) => {
      pmap[r.user_id] = r;
    });
    setPresenceByUser(pmap);
    if (hiddenRes.error) {
      const msg = hiddenRes.error.message || "";
      // DB pas migrée / PostgREST n'a pas la table (schema cache) : on désactive la fonctionnalité
      // pour éviter de casser la messagerie.
      if (msg.includes("schema cache") || msg.includes("Could not find the table")) {
        setDmHideAvailable(false);
        setHiddenDmPartnerIds([]);
      } else {
        toast.error(`Masquage MP : ${msg}`, { id: "messages-dm-hidden-load" });
      }
    } else {
      setDmHideAvailable(true);
      setHiddenDmPartnerIds(((hiddenRes.data ?? []) as any[]).map((r: any) => r.partner_user_id));
    }
  }, [user]);

  const unhideDmPartner = useCallback(async (partnerId: string) => {
    if (!user?.id) return;
    if (!dmHideAvailable) return;
    const { error } = await (supabase as any)
      .from("user_dm_hidden_partners")
      .delete()
      .eq("user_id", user.id)
      .eq("partner_user_id", partnerId);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("schema cache") || msg.includes("Could not find the table")) {
        setDmHideAvailable(false);
        return;
      }
      toast.error(msg);
      return;
    }
    setHiddenDmPartnerIds((prev) => prev.filter((id) => id !== partnerId));
  }, [user?.id, dmHideAvailable]);

  const hideDmPartner = useCallback(async (partnerId: string) => {
    if (!user?.id) return;
    if (!dmHideAvailable) {
      toast.error("Fonction indisponible : migration Supabase manquante (table MP masqués).");
      return;
    }
    const { error } = await (supabase as any).from("user_dm_hidden_partners").upsert(
      { user_id: user.id, partner_user_id: partnerId },
      { onConflict: "user_id,partner_user_id" },
    );
    if (error) {
      const msg = error.message || "";
      if (msg.includes("schema cache") || msg.includes("Could not find the table")) {
        setDmHideAvailable(false);
        toast.error("Fonction indisponible : migration Supabase manquante (table MP masqués).");
        return;
      }
      toast.error(msg);
      return;
    }
    setHiddenDmPartnerIds((prev) => (prev.includes(partnerId) ? prev : [...prev, partnerId]));
    setTarget((t) => (t?.type === "user" && t.id === partnerId ? null : t));
    toast.success("Conversation retirée de votre liste");
  }, [user?.id, dmHideAvailable]);

  useEffect(() => {
    unhideDmPartnerRef.current = unhideDmPartner;
  }, [unhideDmPartner]);

  useEffect(() => { loadData(); }, [loadData]);

  /** En changeant de mode (Discussions ↔ Messages privés), on quitte un fil incompatible. */
  useEffect(() => {
    setTarget((t) => {
      if (messagingSection === "messagerie" && t?.type === "group") return null;
      if (messagingSection === "discussion" && t?.type === "user") return null;
      return t;
    });
  }, [messagingSection]);

  /** Vue « Messages épinglés » : pas de fil ouvert (aligné sur la barre d’app). */
  useEffect(() => {
    if (searchParams.get("view") !== "pinned") return;
    setTarget(null);
  }, [searchParams]);

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
    void unhideDmPartner(dm);
    setTarget({ type: "user", id: dm });
    const next = new URLSearchParams(searchParams);
    next.delete("dm");
    next.set("section", "messagerie");
    setSearchParams(next, { replace: true });
  }, [searchParams, allProfiles, user?.id, setSearchParams, unhideDmPartner]);

  /** Premier salon public par défaut en mode Discussions uniquement (pas en Messages privés). */
  useEffect(() => {
    if (messagingSection === "messagerie") return;
    if (groups.length === 0) return;
    const salons = sortMessagingChannels(groups.filter((g) => g.is_public && g.kind === "salon"));
    if (salons.length === 0) return;
    setTarget((t) => (t === null ? { type: "group", id: salons[0].id } : t));
  }, [groups, messagingSection]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const row = payload.new as Message;
          if (
            row &&
            !row.group_id &&
            user &&
            row.recipient_id === user.id &&
            row.sender_id &&
            row.sender_id !== user.id &&
            hiddenDmPartnerIdsRef.current.has(row.sender_id)
          ) {
            void unhideDmPartnerRef.current(row.sender_id);
          }
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_dm_hidden_partners",
          filter: `user_id=eq.${user.id}`,
        },
        () => void loadData(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  // Marquer comme lus : DM par UPDATE ; groupes / salons par RPC (salons publics : recipient_id = expéditeur → RLS bloquait l’UPDATE client).
  useEffect(() => {
    if (!user || !target) return;
    if (target.type === "user") {
      const unread = messages.filter(
        (m) =>
          m.sender_id === target.id && m.recipient_id === user.id && !m.read && !m.group_id,
      );
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
            return;
          }
          setMessages((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, read: true } : m)));
        });
      return;
    }

    const unread = messages.filter(
      (m) => m.group_id === target.id && m.sender_id !== user.id && !m.read,
    );
    const ids = unread.map((m) => m.id).filter((id) => !markedReadRef.current.has(id));
    if (ids.length === 0) return;
    ids.forEach((id) => markedReadRef.current.add(id));
    void (supabase.rpc as any)("mark_group_messages_read", { p_group_id: target.id }).then(({ error }: any) => {
      if (error) {
        ids.forEach((id) => markedReadRef.current.delete(id));
        toast.error(error.message);
        return;
      }
      const grp = groups.find((g) => g.id === target.id);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.group_id !== target.id || m.read || m.sender_id === user.id) return m;
          if (grp?.is_public && grp.kind === "salon") {
            return { ...m, read: true };
          }
          if (m.recipient_id === user.id) {
            return { ...m, read: true };
          }
          return m;
        }),
      );
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

  const getUnreadCount = useCallback(
    (t: ConversationTarget) =>
      messages.filter((m) => {
        if (t.type === "user") {
          return m.sender_id === t.id && m.recipient_id === user?.id && !m.read && !m.group_id;
        }
        return m.group_id === t.id && m.sender_id !== user?.id && !m.read;
      }).length,
    [messages, user?.id],
  );

  const getProfileById = useCallback(
    (id: string) => allProfiles.find((p) => p.user_id === id),
    [allProfiles],
  );

  const pinnedMessagesSorted = useMemo(
    () =>
      [...messages]
        .filter((m) => m.pinned_at)
        .sort((a, b) => new Date(b.pinned_at!).getTime() - new Date(a.pinned_at!).getTime()),
    [messages],
  );

  const getPinnedContextLabel = useCallback(
    (m: Message) => {
      if (m.group_id) {
        const g = groups.find((x) => x.id === m.group_id);
        return g ? (g.is_public ? `# ${g.name}` : g.name) : "Conversation";
      }
      if (!user) return "Message privé";
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      return getProfileById(other)?.display_name?.trim() || "Message privé";
    },
    [groups, user, getProfileById],
  );

  const openFromPinnedList = useCallback(
    (m: Message) => {
      if (!user) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("view");
          next.set("focus", m.id);
          if (m.group_id) next.set("section", "discussion");
          else next.set("section", "messagerie");
          return next;
        },
        { replace: true },
      );
      if (m.group_id) {
        setTarget({ type: "group", id: m.group_id });
      } else {
        const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        setTarget({ type: "user", id: other });
      }
    },
    [user, setSearchParams],
  );

  /** Après ouverture depuis la liste épinglée : scroll vers le message ciblé. */
  useEffect(() => {
    const id = searchParams.get("focus");
    if (!id || !target) return;
    if (!messages.some((msg) => msg.id === id)) return;
    const t = window.setTimeout(() => {
      document.getElementById(`message-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("focus");
        return next;
      },
      { replace: true },
    );
    return () => clearTimeout(t);
  }, [target, messages, searchParams, setSearchParams]);

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
        const { error } = await (supabase as any).from("message_reactions").delete().eq("id", mine.id);
        if (error) toast.error(error.message);
      } else {
        const { error } = await (supabase as any).from("message_reactions").insert({
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
    const nowIso = new Date().toISOString();
    setMessages((prev) =>
      prev.map((row) =>
        row.id === m.id
          ? {
              ...row,
              pinned_at: nextPinned ? nowIso : null,
              pinned_by: nextPinned && user?.id ? user.id : null,
            }
          : row,
      ),
    );
    const { error } = await (supabase.rpc as any)("set_message_pin_state", {
      p_message_id: m.id,
      p_pinned: nextPinned,
    });
    if (error) {
      toast.error(error.message);
      await loadData();
      return;
    }
    toast.success(nextPinned ? "Message épinglé" : "Épinglage retiré");
  }, [user?.id, loadData]);

  const salonsWithMeta = useMemo(
    () =>
      buildGroupsWithMeta(
        sortMessagingChannels(groups.filter((g) => g.is_public && g.kind === "salon")),
        messages,
        user?.id,
      ),
    [groups, messages, user?.id],
  );

  const privateGroupsWithMeta = useMemo(
    () =>
      buildGroupsWithMeta(
        sortMessagingChannels(groups.filter((g) => !g.is_public && g.kind === "group")),
        messages,
        user?.id,
      ),
    [groups, messages, user?.id],
  );

  const mobileChannelsMeta = useMemo(
    () => [...salonsWithMeta, ...privateGroupsWithMeta],
    [salonsWithMeta, privateGroupsWithMeta],
  );

  const persistChannelOrder = useCallback(
    async (kind: "salon" | "group", orderedIds: string[]) => {
      if (!canManageSalons) return;
      const { error } = await (supabase.rpc as any)("reorder_messaging_channels", {
        p_public_salon_ids: kind === "salon" ? orderedIds : [],
        p_private_group_ids: kind === "group" ? orderedIds : [],
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      setGroups((prev) =>
        prev.map((g) => {
          const isSalonRow = g.is_public && g.kind === "salon";
          const isPrivateGroup = !g.is_public && g.kind === "group";
          if (kind === "salon" && isSalonRow) {
            const idx = orderedIds.indexOf(g.id);
            return idx === -1 ? g : { ...g, nav_sort_order: idx + 1 };
          }
          if (kind === "group" && isPrivateGroup) {
            const idx = orderedIds.indexOf(g.id);
            return idx === -1 ? g : { ...g, nav_sort_order: idx + 1 };
          }
          return g;
        }),
      );
    },
    [canManageSalons],
  );

  const getGroupUnreadStable = useCallback(
    (groupId: string) => getUnreadCount({ type: "group", id: groupId }),
    [getUnreadCount],
  );

  const hiddenDmPartnerSet = useMemo(() => new Set(hiddenDmPartnerIds), [hiddenDmPartnerIds]);

  /** Total non lus salons + groupes = somme des compteurs par fil (aligné navbar ↔ liste). Le fil ouvert est exclu (comme Discord). */
  const totalChannelUnread = useMemo(() => {
    if (!user) return 0;
    return groups.reduce((sum, g) => {
      if (g.kind !== "salon" && g.kind !== "group") return sum;
      if (target?.type === "group" && target.id === g.id) return sum;
      const n = messages.filter(
        (m) => m.group_id === g.id && m.sender_id !== user.id && !m.read,
      ).length;
      return sum + n;
    }, 0);
  }, [groups, messages, user, target]);

  const totalDmUnread = useMemo(() => {
    if (!user) return 0;
    return messages.filter(
      (m) =>
        !m.group_id &&
        m.sender_id !== user.id &&
        m.recipient_id === user.id &&
        !m.read &&
        !(target?.type === "user" && target.id === m.sender_id) &&
        !hiddenDmPartnerSet.has(m.sender_id),
    ).length;
  }, [messages, user, target, hiddenDmPartnerSet]);

  /** Historique MP 1:1 (pas l’annuaire complet) — partenaires ayant au moins un message avec moi. */
  const dmConversations = useMemo((): MessagingDmConversationRow[] => {
    if (!user?.id) return [];
    const byUser = new Map<string, { lastAt: string; unread: number }>();
    for (const m of messages) {
      if (m.group_id) continue;
      const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!other || other === user.id) continue;
      const row = byUser.get(other) ?? { lastAt: m.created_at, unread: 0 };
      if (m.created_at > row.lastAt) row.lastAt = m.created_at;
      if (m.sender_id !== user.id && m.recipient_id === user.id && !m.read) row.unread += 1;
      byUser.set(other, row);
    }
    return [...byUser.entries()]
      .filter(([userId]) => !hiddenDmPartnerSet.has(userId))
      .map(([userId, v]) => {
        const p = allProfiles.find((x) => x.user_id === userId);
        return {
          userId,
          displayName: p?.display_name?.trim() || "Utilisateur",
          avatarUrl: p?.avatar_url ?? null,
          lastAt: v.lastAt,
          unread: v.unread,
        };
      })
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [messages, user?.id, allProfiles, hiddenDmPartnerSet]);

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
        void unhideDmPartner(target.id);
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
      (r) => r.sender_id === user.id,
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

  // Delete message (auteur) + modération admin/super admin (n'importe quel message)
  const handleDeleteMsg = async () => {
    if (!deletingMsg || !user) return;
    const isMine = deletingMsg.sender_id === user.id;
    if (!isMine && !isAdmin) {
      toast.error("Ce message ne peut plus être supprimé.");
      setDeletingMsg(null);
      return;
    }

    /**
     * Envoi groupe avec `group_send_id` : une ligne DB par destinataire. Le state local peut ne pas
     * contenir toutes les lignes (réseau, timing), donc `.in(id, …)` ne supprimait qu’un sous-ensemble :
     * toast « supprimé » mais la bulle restait (autre id du même envoi). On supprime côté serveur par
     * clé logique (groupe + lot + expéditeur) pour retirer tout le lot.
     */
    let deletedRows: { id: string }[] | null = null;
    let error: { message: string } | null = null;

    /** RPC SECURITY DEFINER : même règles que la lecture + modération (évite DELETE RLS à 0 ligne). */
    if (deletingMsg.group_id && deletingMsg.group_send_id) {
      const res = await supabase.rpc("delete_messages_moderation_by_send", {
        p_group_id: deletingMsg.group_id,
        p_group_send_id: deletingMsg.group_send_id,
        p_sender_id: deletingMsg.sender_id,
      });
      deletedRows = (res.data ?? []).map((id) => ({ id }));
      error = res.error;
    } else {
      const rows = (deletingMsg.group_id ? siblingGroupSendRows(deletingMsg, messages) : [deletingMsg]).filter((r) =>
        isMine ? r.sender_id === user.id : isAdmin,
      );
      if (rows.length === 0) {
        toast.error("Ce message ne peut plus être supprimé.");
        setDeletingMsg(null);
        return;
      }
      const res = await supabase.rpc("delete_messages_moderation_by_ids", {
        p_message_ids: rows.map((r) => r.id),
      });
      deletedRows = (res.data ?? []).map((id) => ({ id }));
      error = res.error;
    }

    if (error) {
      toast.error(error.message);
      return;
    }
    const deletedIds = new Set((deletedRows ?? []).map((r) => r.id));
    if (deletedIds.size === 0) {
      toast.error(
        "Suppression impossible (droits insuffisants ou message déjà retiré). Les administrateurs ne peuvent supprimer que les messages visibles selon les règles du salon ou de la conversation.",
      );
      setDeletingMsg(null);
      return;
    }

    /**
     * Retirer du state toutes les lignes concernées : le serveur peut renvoyer un sous-ensemble d’ids
     * selon PostgREST, et en groupe il peut rester localement une autre ligne du même envoi (même bulle).
     * On aligne aussi les réactions sur les ids réellement enlevés.
     */
    const sameSendAsDeleting = (m: Message) =>
      Boolean(
        deletingMsg.group_id &&
          deletingMsg.group_send_id &&
          m.group_id === deletingMsg.group_id &&
          m.group_send_id === deletingMsg.group_send_id &&
          m.sender_id === deletingMsg.sender_id,
      );

    setMessages((prev) => {
      const removedIds = new Set<string>();
      const next = prev.filter((m) => {
        const drop = deletedIds.has(m.id) || sameSendAsDeleting(m);
        if (drop) removedIds.add(m.id);
        return !drop;
      });
      setReactions((rprev) => rprev.filter((r) => !removedIds.has(r.message_id)));
      return next;
    });

    setDeletingMsg(null);
    toast.success(
      deletedIds.size > 1
        ? "Message retiré pour tous les destinataires concernés."
        : "Message supprimé",
    );
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
      persistChannelOrder,
      viewerUserId: user?.id,
      totalChannelUnread,
      totalDmUnread,
      messagingSection,
      setMessagingSection,
      dmConversations,
      hideDmPartner,
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
      persistChannelOrder,
      user?.id,
      totalChannelUnread,
      totalDmUnread,
      messagingSection,
      setMessagingSection,
      dmConversations,
      hideDmPartner,
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
      const maxSalonOrder = groups
        .filter((x) => x.is_public && x.kind === "salon")
        .reduce((m, x) => Math.max(m, x.nav_sort_order ?? 0), 0);
      const { data: newSalon, error: salonErr } = await supabase
        .from("conversation_groups")
        .insert({
          name: groupName.trim(),
          created_by: user.id,
          kind: "salon",
          is_public: true,
          nav_sort_order: maxSalonOrder + 1,
        })
        .select()
        .single();
      if (salonErr) {
        toast.error(salonErr.message);
        return;
      }
      if (newSalon) toast.success("Salon créé");
    } else {
      const maxGroupOrder = groups
        .filter((x) => !x.is_public && x.kind === "group")
        .reduce((m, x) => Math.max(m, x.nav_sort_order ?? 0), 0);
      const { data: newGroup, error: grpErr } = await supabase
        .from("conversation_groups")
        .insert({
          name: groupName.trim(),
          created_by: user.id,
          kind: "group",
          is_public: false,
          nav_sort_order: maxGroupOrder + 1,
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
    const canOpenActions = isMine || isAdmin;
    const canDelete = isMine || isAdmin;
    const canQuickDelete = isAdmin;
    const sender = getProfileById(m.sender_id);
    const displayName = sender?.display_name?.trim() || (isMine ? "Moi" : "Utilisateur");
    const avatarUrl = sender?.avatar_url;
    const msgReactions = reactionsByMessageId[m.id] ?? [];
    const summaries = reactionSummaries(msgReactions, user?.id);

    return (
      <div
        id={`message-${m.id}`}
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
                {format(new Date(m.created_at), "HH:mm")}
              </time>
            </div>
          )}
          {m.pinned_at && (
            <div className="mb-1 mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <FontAwesomeIcon icon={faThumbtack} className="h-3 w-3" aria-hidden />
              Épinglé
            </div>
          )}
          <div className={cn("inline-flex max-w-full items-end gap-1.5", showHeader ? "mt-0.5" : "")}>
            <div
              className={cn(
                "min-w-0 max-w-full whitespace-pre-wrap break-words",
                "text-[15px] leading-[1.22] text-foreground dark:text-[#dbdee1]",
                "[&_a]:underline [&_a]:text-blue-600 dark:[&_a]:text-[#00a8fc]",
                "[&_p]:my-0 [&_p]:text-[15px] [&_p]:leading-[1.22]",
                "[&_p+p]:mt-1.5 [&_li]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_ul]:list-inside [&_ol]:list-inside",
              )}
              dangerouslySetInnerHTML={{ __html: m.content }}
            />
            {isMine && !m.group_id && (
              <span className="inline-flex shrink-0 self-end pb-0" title={m.read ? "Lu" : "Envoyé"}>
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
                  <img src={twemojiUrl(emoji)} alt={emoji} className="h-4 w-4" loading="lazy" />
                  <span className="min-w-[1ch] tabular-nums text-muted-foreground dark:text-[#b5bac1]">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={cn(
            "absolute right-2 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100",
            // Barre de réactions "à cheval" sur la bulle, style Discord.
            showHeader ? "-top-3" : "-top-2.5",
          )}
        >
          <div className="flex items-center rounded-sm border border-border/80 bg-card py-0.5 pl-0.5 pr-0.5 shadow-md dark:border-white/15 dark:bg-[#1f2126]">
            {MESSAGE_QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded text-[15px] hover:bg-black/10 dark:hover:bg-white/10"
                aria-label={`Réagir ${emoji}`}
                onClick={() => void toggleMessageReaction(m.id, emoji)}
              >
                <img src={twemojiUrl(emoji)} alt={emoji} className="h-5 w-5" loading="lazy" />
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
                      <img src={twemojiUrl(emoji)} alt={emoji} className="h-6 w-6" loading="lazy" />
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
            {canQuickDelete && deleteShortcutArmed && (
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-black/10 dark:hover:bg-white/10"
                title="Suppression rapide (Maj)"
                aria-label="Suppression rapide du message"
                onClick={() => setDeletingMsg(m)}
              >
                <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
              </button>
            )}
            {canOpenActions && (
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
                  {isMine && (
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingMsg(m);
                        setEditContent(m.content);
                      }}
                    >
                      <FontAwesomeIcon icon={faPen} className="mr-2 h-3 w-3" /> Modifier
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeletingMsg(m)}>
                    <FontAwesomeIcon icon={faTrash} className="mr-2 h-3 w-3" /> Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    );
  };

  /** Suffixe après le titre (pas de répétition du nom : déjà affiché à gauche). */
  const conversationHeaderMetaSuffix =
    !target
      ? null
      : target.type === "user"
        ? `| ${labelForRow(presenceByUser[target.id])}`
        : activeGroup?.is_public === true
          ? `| Salon public · ${allProfiles.length} membres`
          : `| Groupe privé · ${groupMembers.filter((gm) => gm.group_id === target.id).length} membres`;

  const conversationHeaderLeading =
    target?.type === "user" ? (
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground shell:h-9 shell:w-9">
        <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 shell:h-4 shell:w-4" />
        <PresenceAvatarBadge presence={presenceByUser[target.id]} className="pointer-events-none absolute -bottom-0.5 -right-0.5 scale-90" />
      </div>
    ) : activeGroup?.is_public ? (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground shell:h-9 shell:w-9">
        <FontAwesomeIcon icon={faHashtag} className="h-3.5 w-3.5 shell:h-4 shell:w-4" />
      </div>
    ) : target?.type === "group" ? (
      <Avatar className="h-8 w-8 shrink-0 shell:h-9 shell:w-9">
        {targetAvatar && <AvatarImage src={targetAvatar} />}
        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
          <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    ) : null;

  const conversationHeaderActions = (
    <>
      {target?.type === "group" && activeGroup?.is_public && canManageSalons && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 shell:h-10 shell:w-10">
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
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 shell:h-10 shell:w-10">
              <FontAwesomeIcon icon={faEllipsisVertical} className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditGroup(groups.find((g) => g.id === target.id)!)}>
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
    </>
  );

  const ConversationHeader = ({ onBack }: { onBack?: () => void }) => (
    <ContextSubHeader
      onBack={onBack}
      leading={conversationHeaderLeading}
      title={targetName}
      meta={conversationHeaderMetaSuffix ?? undefined}
      actions={conversationHeaderActions}
    />
  );

  const MessagesArea = () => (
    <div
      ref={scrollRef}
      className={cn(
        "min-h-0 min-w-0 w-full flex-1 overflow-y-auto overscroll-y-contain",
        "pb-4 shell:pb-[min(48vh,18rem)]",
      )}
    >
      {groupedMessages.length === 0 && (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-start gap-2 px-4 pt-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <FontAwesomeIcon icon={faComments} className="h-7 w-7 text-primary/40" />
          </div>
          <p className="text-[15px] text-muted-foreground dark:text-[#949ba4]">Démarrez la conversation…</p>
        </div>
      )}
      {groupedMessages.map((group) => (
        <div key={group.date}>
          <div className="my-4 flex items-center gap-3 px-4">
            <div className="h-[2px] flex-1 self-center bg-border dark:bg-white/[0.08]" />
            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground dark:text-[#949ba4]">
              {formatMessageDate(group.msgs[0].created_at)}
            </span>
            <div className="h-[2px] flex-1 self-center bg-border dark:bg-white/[0.08]" />
          </div>
          {group.msgs.map((m, i) => (
            <MessageBubble key={m.id} m={m} i={i} group={group.msgs} />
          ))}
        </div>
      ))}
    </div>
  );

  /** Mobile : onglets Discussions / Messages privés + sélecteur de fil (salons ou MP). */
  const GroupsToolbar = () => (
    <div className="flex shrink-0 flex-col border-b border-border/60 bg-background">
      <div className="flex gap-1 px-2 py-2">
        <Button
          type="button"
          variant={messagingSection === "discussion" ? "secondary" : "ghost"}
          size="sm"
          className="h-9 flex-1 text-xs font-semibold"
          onClick={() => setMessagingSection("discussion")}
        >
          Discussions
        </Button>
        <Button
          type="button"
          variant={messagingSection === "messagerie" ? "secondary" : "ghost"}
          size="sm"
          className="h-9 flex-1 text-xs font-semibold"
          onClick={() => setMessagingSection("messagerie")}
        >
          Messages privés
        </Button>
      </div>
      {messagingSection === "discussion" ? (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 font-normal max-w-[min(100%,280px)]">
                {target?.type === "group" && groups.find((g) => g.id === target.id)?.is_public ? (
                  <FontAwesomeIcon icon={faHashtag} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">
                  {target?.type === "group"
                    ? (groups.find((g) => g.id === target.id)?.name ?? "Conversation")
                    : "Salons & groupes"}
                </span>
                <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[min(70vh,320px)] w-80 overflow-y-auto" align="start">
              {mobileChannelsMeta.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">Aucun salon ni groupe.</p>
              ) : (
                mobileChannelsMeta.map((g) => {
                  const unread = getUnreadCount({ type: "group", id: g.id });
                  const active = target?.type === "group" && target.id === g.id;
                  const hasUnread = unread > 0 && !active;
                  return (
                    <DropdownMenuItem
                      key={g.id}
                      className={cn(
                        "relative flex cursor-pointer items-center gap-1.5 rounded py-2 pl-2 pr-2",
                        active && "bg-primary/10 focus:bg-primary/10",
                      )}
                      onClick={() => setTarget({ type: "group", id: g.id })}
                    >
                      {hasUnread && (
                        <span
                          className="pointer-events-none absolute left-0 top-1/2 z-[1] h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-foreground"
                          aria-hidden
                        />
                      )}
                      {g.is_public ? (
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
                        <Avatar className="h-8 w-8 shrink-0">
                          {g.avatar_url && <AvatarImage src={g.avatar_url} />}
                          <AvatarFallback className="bg-primary/15 text-[10px] text-primary">
                            <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="min-w-0 flex-1 text-left">
                        <p
                          className={cn(
                            "truncate text-sm",
                            hasUnread && "font-semibold text-foreground",
                            !hasUnread && active && "font-medium text-foreground",
                            !hasUnread && !active && "font-medium text-zinc-500 dark:text-zinc-400",
                          )}
                        >
                          {g.name}
                        </p>
                      </div>
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
      ) : (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 font-normal max-w-[min(100%,280px)]">
                <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {target?.type === "user"
                    ? (getProfileById(target.id)?.display_name?.trim() ?? "Conversation")
                    : "Messages privés"}
                </span>
                <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[min(70vh,320px)] w-80 overflow-y-auto" align="start">
              {dmConversations.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">Aucune conversation. Utilisez l’annuaire (Membres).</p>
              ) : (
                dmConversations.map((row) => {
                  const active = target?.type === "user" && target.id === row.userId;
                  const hasUnread = row.unread > 0 && !active;
                  return (
                    <DropdownMenuItem
                      key={row.userId}
                      className={cn(
                        "relative flex cursor-pointer items-center gap-1 rounded py-2 pl-2 pr-1",
                        active && "bg-primary/10 focus:bg-primary/10",
                      )}
                      onSelect={(e) => {
                        const el = e.target as HTMLElement;
                        if (el.closest("[data-dismiss-dm]")) {
                          void hideDmPartner(row.userId);
                          return;
                        }
                        setTarget({ type: "user", id: row.userId });
                      }}
                    >
                      {hasUnread && (
                        <span
                          className="pointer-events-none absolute left-0 top-1/2 z-[1] h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-foreground"
                          aria-hidden
                        />
                      )}
                      <Avatar className="h-8 w-8 shrink-0">
                        {row.avatarUrl && <AvatarImage src={row.avatarUrl} alt="" />}
                        <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                          {row.displayName
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 text-left">
                        <p
                          className={cn(
                            "truncate text-sm",
                            hasUnread && "font-semibold text-foreground",
                            !hasUnread && active && "font-medium text-foreground",
                            !hasUnread && !active && "font-medium text-zinc-500 dark:text-zinc-400",
                          )}
                        >
                          {row.displayName}
                        </p>
                      </div>
                      {row.unread > 0 && (
                        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                          {row.unread > 99 ? "99+" : row.unread}
                        </span>
                      )}
                      <span
                        data-dismiss-dm
                        title="Retirer de votre liste"
                        aria-hidden
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-foreground"
                      >
                        <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                      </span>
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );

  const messagesMainClassName =
    "flex min-h-0 min-w-0 w-full max-w-none flex-1 flex-col !mx-0 !max-w-none !space-y-0 !justify-start !overflow-hidden !overflow-y-hidden px-0 pt-0 pb-28 shell:!px-0 shell:!py-0 shell:min-h-0";

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
        <div className="fixed inset-0 top-16 bottom-[68px] z-30 flex w-full min-w-0 flex-col overflow-hidden bg-background">
          <div className="relative z-40 shrink-0 border-b border-border/30 bg-background/90 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
            <ConversationHeader onBack={() => setTarget(null)} />
          </div>
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
      <div className="flex min-h-0 min-w-0 w-full max-w-none flex-1 flex-col justify-start overflow-hidden">
        {isMobile && <GroupsToolbar />}
        {target ? (
          <>
            <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
              <div className="relative z-30 shrink-0 border-b border-border/30 bg-background/90 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
                <ConversationHeader />
              </div>
              <MessagesArea />
            </div>
            <MessagesInputBar
              value={newMsg}
              onChange={setNewMsg}
              onSend={() => void sendMessage()}
              sendDisabled={!newMsg.trim() || sending}
            />
          </>
        ) : pinnedView ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {pinnedMessagesSorted.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <FontAwesomeIcon icon={faThumbtack} className="h-9 w-9 text-primary/30" />
                </div>
                <p className="text-sm font-medium text-foreground">Aucun message épinglé</p>
                <p className="max-w-[280px] text-xs leading-relaxed text-muted-foreground">
                  Épinglez un message depuis une conversation (salon, groupe ou message privé).
                </p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-28">
                {pinnedMessagesSorted.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => void openFromPinnedList(m)}
                    className="mb-2 w-full rounded-2xl border border-border/60 bg-card/50 p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      <FontAwesomeIcon icon={faThumbtack} className="h-3 w-3" />
                      {getPinnedContextLabel(m)}
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-foreground">
                      {previewMessageContent(m.content)}
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {format(new Date(m.pinned_at!), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <FontAwesomeIcon
                icon={messagingSection === "messagerie" ? faEnvelope : faComments}
                className="h-9 w-9 text-primary/30"
              />
            </div>
            <p className="text-sm font-medium text-foreground">
              {messagingSection === "messagerie" ? "Messages privés" : "Discussions"}
            </p>
            <p className="max-w-[280px] text-xs leading-relaxed text-muted-foreground">
              {messagingSection === "messagerie"
                ? "Choisissez une conversation dans la liste à gauche ou un contact dans l’annuaire à droite (icône « Membres » sur mobile)."
                : "Sélectionnez un salon ou un groupe à gauche. Pour les messages privés, passez à l’onglet « Messages privés » ou utilisez l’annuaire."}
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
