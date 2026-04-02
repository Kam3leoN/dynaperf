import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  faPaperPlane, faComments, faSearch, faArrowLeft, faCheck, faCheckDouble,
  faEllipsisVertical, faPen, faTrash, faPlus, faUsers, faUserPlus, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

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
}

interface ConversationGroup {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
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

type ConversationTarget = { type: "user"; id: string } | { type: "group"; id: string };

export default function Messages() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [target, setTarget] = useState<ConversationTarget | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Edit/delete states
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingMsg, setDeletingMsg] = useState<Message | null>(null);

  // Group CRUD
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ConversationGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<ConversationGroup | null>(null);

  // Members management
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [profilesRes, msgsRes, groupsRes, membersRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url"),
      supabase.from("messages").select("*").order("created_at", { ascending: true }),
      supabase.from("conversation_groups").select("*"),
      supabase.from("conversation_group_members").select("group_id, user_id"),
    ]);
    const allP = (profilesRes.data || []) as Profile[];
    setAllProfiles(allP);
    setProfiles(allP.filter((p: any) => p.user_id !== user.id));
    if (msgsRes.data) setMessages(msgsRes.data as any);
    if (groupsRes.data) setGroups(groupsRes.data as any);
    if (membersRes.data) setGroupMembers(membersRes.data as any);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMessages(prev => [...prev, payload.new as Message]);
        } else if (payload.eventType === "UPDATE") {
          setMessages(prev => prev.map(m => m.id === (payload.new as Message).id ? payload.new as Message : m));
        } else if (payload.eventType === "DELETE") {
          setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_groups" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_group_members" }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  // Mark as read
  useEffect(() => {
    if (!user || !target) return;
    const unread = messages.filter(m => {
      if (target.type === "user") {
        return m.sender_id === target.id && m.recipient_id === user.id && !m.read && !m.group_id;
      }
      return m.group_id === target.id && m.sender_id !== user.id && !m.read;
    });
    unread.forEach(m => {
      supabase.from("messages").update({ read: true }).eq("id", m.id).then();
    });
  }, [target, messages, user]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, target]);

  const conversation = messages.filter(m => {
    if (!target) return false;
    if (target.type === "user") {
      return !m.group_id && (
        (m.sender_id === user?.id && m.recipient_id === target.id) ||
        (m.sender_id === target.id && m.recipient_id === user?.id)
      );
    }
    return m.group_id === target.id;
  });

  const getUnreadCount = (t: ConversationTarget) =>
    messages.filter(m => {
      if (t.type === "user") {
        return m.sender_id === t.id && m.recipient_id === user?.id && !m.read && !m.group_id;
      }
      return m.group_id === t.id && m.sender_id !== user?.id && !m.read;
    }).length;

  const getProfileById = (id: string) => allProfiles.find(p => p.user_id === id);

  const contacts = profiles
    .filter(p => !search.trim() || (p.display_name || "").toLowerCase().includes(search.toLowerCase()))
    .map(p => {
      const lastMsg = messages
        .filter(m => !m.group_id && ((m.sender_id === p.user_id && m.recipient_id === user?.id) || (m.sender_id === user?.id && m.recipient_id === p.user_id)))
        .at(-1);
      return { ...p, lastMsg };
    })
    .sort((a, b) => {
      if (!a.lastMsg && !b.lastMsg) return 0;
      if (!a.lastMsg) return 1;
      if (!b.lastMsg) return -1;
      return new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime();
    });

  const filteredGroups = groups
    .filter(g => !search.trim() || g.name.toLowerCase().includes(search.toLowerCase()))
    .map(g => {
      const lastMsg = messages.filter(m => m.group_id === g.id).at(-1);
      return { ...g, lastMsg };
    })
    .sort((a, b) => {
      if (!a.lastMsg && !b.lastMsg) return 0;
      if (!a.lastMsg) return 1;
      if (!b.lastMsg) return -1;
      return new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime();
    });

  const sendMessage = async () => {
    if (!newMsg.trim() || !target || !user) return;
    setSending(true);
    if (target.type === "user") {
      await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: target.id,
        content: newMsg.trim(),
      });
    } else {
      // Send to all group members
      const members = groupMembers.filter(gm => gm.group_id === target.id && gm.user_id !== user.id);
      if (members.length === 0) {
        // Just insert one message with group_id
        await supabase.from("messages").insert({
          sender_id: user.id,
          recipient_id: user.id,
          content: newMsg.trim(),
          group_id: target.id,
        });
      } else {
        const inserts = members.map(m => ({
          sender_id: user.id,
          recipient_id: m.user_id,
          content: newMsg.trim(),
          group_id: target.id,
        }));
        await supabase.from("messages").insert(inserts);
      }
    }
    setNewMsg("");
    setSending(false);
  };

  // Edit message
  const handleEditMsg = async () => {
    if (!editingMsg || !editContent.trim()) return;
    await supabase.from("messages").update({ content: editContent.trim() }).eq("id", editingMsg.id);
    setEditingMsg(null);
    toast.success("Message modifié");
  };

  // Delete message
  const handleDeleteMsg = async () => {
    if (!deletingMsg) return;
    await supabase.from("messages").delete().eq("id", deletingMsg.id);
    setDeletingMsg(null);
    toast.success("Message supprimé");
  };

  // Group CRUD
  const openNewGroup = () => {
    setEditingGroup(null);
    setGroupName("");
    setSelectedMembers([]);
    setGroupDialogOpen(true);
  };

  const openEditGroup = (g: ConversationGroup) => {
    setEditingGroup(g);
    setGroupName(g.name);
    setSelectedMembers(groupMembers.filter(gm => gm.group_id === g.id).map(gm => gm.user_id));
    setGroupDialogOpen(true);
  };

  const saveGroup = async () => {
    if (!groupName.trim() || !user) return;
    if (editingGroup) {
      await supabase.from("conversation_groups").update({ name: groupName.trim() }).eq("id", editingGroup.id);
      // Sync members
      const currentMembers = groupMembers.filter(gm => gm.group_id === editingGroup.id).map(gm => gm.user_id);
      const toAdd = selectedMembers.filter(id => !currentMembers.includes(id));
      const toRemove = currentMembers.filter(id => !selectedMembers.includes(id) && id !== user.id);
      if (toRemove.length) {
        for (const uid of toRemove) {
          await supabase.from("conversation_group_members").delete().eq("group_id", editingGroup.id).eq("user_id", uid);
        }
      }
      if (toAdd.length) {
        await supabase.from("conversation_group_members").insert(toAdd.map(uid => ({ group_id: editingGroup.id, user_id: uid })));
      }
      toast.success("Groupe modifié");
    } else {
      const { data: newGroup } = await supabase.from("conversation_groups").insert({
        name: groupName.trim(),
        created_by: user.id,
      }).select().single();
      if (newGroup) {
        const membersToAdd = [...new Set([user.id, ...selectedMembers])];
        await supabase.from("conversation_group_members").insert(
          membersToAdd.map(uid => ({ group_id: newGroup.id, user_id: uid }))
        );
      }
      toast.success("Groupe créé");
    }
    setGroupDialogOpen(false);
    loadData();
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return;
    await supabase.from("conversation_groups").delete().eq("id", deleteGroupTarget.id);
    setDeleteGroupTarget(null);
    if (target?.type === "group" && target.id === deleteGroupTarget.id) setTarget(null);
    toast.success("Groupe supprimé");
    loadData();
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

  // Message bubble component
  const MessageBubble = ({ m, i, group }: { m: Message; i: number; group: Message[] }) => {
    const isMine = m.sender_id === user?.id;
    const showTail = i === 0 || group[i - 1].sender_id !== m.sender_id;
    const canEditOrDelete = isMine && !m.read;
    const senderProfile = target?.type === "group" && !isMine ? getProfileById(m.sender_id) : null;

    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} ${showTail ? "mt-2" : "mt-0.5"} group/msg`}>
        <div className="relative max-w-[80%]">
          {/* Sender name in group */}
          {senderProfile && showTail && (
            <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{senderProfile.display_name}</p>
          )}
          <div
            className={`px-3 py-1.5 text-sm shadow-sm ${
              isMine
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                : "bg-card text-card-foreground border border-border/50 rounded-2xl rounded-bl-md"
            }`}
          >
            <div className="whitespace-pre-wrap break-words leading-relaxed [&_a]:underline" dangerouslySetInnerHTML={{ __html: m.content }} />
            <div className={`flex items-center gap-1 justify-end mt-0.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
              <span className="text-[10px]">{format(new Date(m.created_at), "HH:mm")}</span>
              {isMine && !m.group_id && (
                <FontAwesomeIcon
                  icon={m.read ? faCheckDouble : faCheck}
                  className={`h-2.5 w-2.5 ${m.read ? "text-blue-300" : ""}`}
                />
              )}
            </div>
          </div>
          {/* Edit/Delete dropdown */}
          {canEditOrDelete && (
            <div className="absolute -top-1 right-0 opacity-0 group-hover/msg:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-6 w-6 rounded-full bg-card shadow border border-border flex items-center justify-center">
                    <FontAwesomeIcon icon={faEllipsisVertical} className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditingMsg(m); setEditContent(m.content); }}>
                    <FontAwesomeIcon icon={faPen} className="h-3 w-3 mr-2" /> Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeletingMsg(m)}>
                    <FontAwesomeIcon icon={faTrash} className="h-3 w-3 mr-2" /> Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ConversationHeader = ({ onBack }: { onBack?: () => void }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
      {onBack && (
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
        </button>
      )}
      <Avatar className="h-9 w-9">
        {targetAvatar && <AvatarImage src={targetAvatar} />}
        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
          {target?.type === "group" ? <FontAwesomeIcon icon={faUsers} className="h-4 w-4" /> : getInitials(targetName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{targetName}</p>
        {target?.type === "group" && (
          <p className="text-[10px] text-muted-foreground">
            {groupMembers.filter(gm => gm.group_id === target.id).length} membres
          </p>
        )}
      </div>
      {target?.type === "group" && isGroupCreator && (
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
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteGroupTarget(groups.find(g => g.id === target.id)!)}>
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
      className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
      style={{
        backgroundImage: "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.04) 0%, transparent 50%)",
        backgroundColor: "hsl(var(--secondary) / 0.3)",
      }}
    >
      {groupedMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <FontAwesomeIcon icon={faComments} className="h-7 w-7 text-primary/40" />
          </div>
          <p className="text-sm text-muted-foreground">Démarrez la conversation…</p>
        </div>
      )}
      {groupedMessages.map(group => (
        <div key={group.date}>
          <div className="flex items-center justify-center my-3">
            <span className="text-[10px] bg-secondary/80 text-muted-foreground px-3 py-1 rounded-full font-medium shadow-sm">
              {formatMessageDate(group.msgs[0].created_at)}
            </span>
          </div>
          {group.msgs.map((m, i) => (
            <MessageBubble key={m.id} m={m} i={i} group={group.msgs} />
          ))}
        </div>
      ))}
    </div>
  );

  const InputArea = () => (
    <div className="px-3 py-2.5 border-t border-border bg-card flex items-end gap-2 shrink-0">
      <RichTextarea
        value={newMsg}
        onChange={setNewMsg}
        placeholder="Écrivez un message…"
        rows={1}
        minimal
        className="flex-1"
      />
      <Button
        size="icon"
        onClick={sendMessage}
        disabled={!newMsg.trim() || sending}
        className="h-10 w-10 rounded-full shrink-0"
      >
        <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const ContactItem = ({ type, id, name, avatarUrl, lastMsg, unread }: {
    type: "user" | "group"; id: string; name: string; avatarUrl: string | null; lastMsg?: Message; unread: number;
  }) => {
    const isActive = target?.type === type && target?.id === id;
    return (
      <button
        onClick={() => setTarget({ type, id })}
        className={`w-full flex items-center gap-3 px-3 py-3 transition-colors text-left ${isActive ? "bg-primary/10" : "hover:bg-secondary/80"}`}
      >
        <Avatar className="h-11 w-11 shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} />}
          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
            {type === "group" ? <FontAwesomeIcon icon={faUsers} className="h-4 w-4" /> : getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>{name}</span>
            {lastMsg && (
              <span className="text-[10px] text-muted-foreground ml-1 shrink-0">
                {format(new Date(lastMsg.created_at), "HH:mm")}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs text-muted-foreground truncate pr-2">
              {lastMsg
                ? (lastMsg.sender_id === user?.id ? "Vous : " : "") + lastMsg.content.replace(/<[^>]*>/g, "").slice(0, 35) + (lastMsg.content.length > 35 ? "…" : "")
                : "Aucun message"}
            </p>
            {unread > 0 && (
              <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-[20px] flex items-center justify-center rounded-full shrink-0">
                {unread}
              </Badge>
            )}
          </div>
        </div>
      </button>
    );
  };

  const Sidebar = () => (
    <div className={`${isMobile ? "w-full" : "w-[320px]"} flex flex-col border-r border-border bg-card`}>
      <div className="p-3 border-b border-border flex items-center gap-2">
        <div className="relative flex-1">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={openNewGroup} title="Nouveau groupe">
          <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {/* Groups first */}
          {filteredGroups.length > 0 && (
            <>
              <div className="px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Groupes</span>
              </div>
              {filteredGroups.map(g => (
                <ContactItem
                  key={`g-${g.id}`}
                  type="group"
                  id={g.id}
                  name={g.name}
                  avatarUrl={g.avatar_url}
                  lastMsg={g.lastMsg}
                  unread={getUnreadCount({ type: "group", id: g.id })}
                />
              ))}
            </>
          )}
          {/* Direct messages */}
          {contacts.length > 0 && (
            <>
              {filteredGroups.length > 0 && (
                <div className="px-3 py-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Messages directs</span>
                </div>
              )}
              {contacts.map(p => (
                <ContactItem
                  key={`u-${p.user_id}`}
                  type="user"
                  id={p.user_id}
                  name={p.display_name || "Utilisateur"}
                  avatarUrl={p.avatar_url}
                  lastMsg={p.lastMsg}
                  unread={getUnreadCount({ type: "user", id: p.user_id })}
                />
              ))}
            </>
          )}
          {contacts.length === 0 && filteredGroups.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Aucun contact</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const showConversation = isMobile ? !!target : true;
  const showContacts = isMobile ? !target : true;

  // Mobile conversation view
  if (isMobile && target) {
    return (
      <AppLayout>
        <div className="fixed inset-0 top-16 bottom-[68px] z-30 flex flex-col bg-background">
          <ConversationHeader onBack={() => setTarget(null)} />
          <MessagesArea />
          <InputArea />
        </div>
        <Dialogs />
      </AppLayout>
    );
  }

  function Dialogs() {
    return (
      <>
        {/* Edit message dialog */}
        <Dialog open={!!editingMsg} onOpenChange={(o) => !o && setEditingMsg(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Modifier le message</DialogTitle></DialogHeader>
            <RichTextarea value={editContent} onChange={setEditContent} rows={3} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMsg(null)}>Annuler</Button>
              <Button onClick={handleEditMsg} disabled={!editContent.trim()}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete message confirm */}
        <AlertDialog open={!!deletingMsg} onOpenChange={(o) => !o && setDeletingMsg(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMsg} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Group CRUD dialog */}
        <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingGroup ? "Modifier le groupe" : "Nouveau groupe"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Nom du groupe</Label>
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ex: Équipe commerciale" />
              </div>
              <div>
                <Label className="text-xs">Membres</Label>
                <div className="max-h-48 overflow-y-auto border border-border rounded-md mt-1">
                  {profiles.map(p => (
                    <label key={p.user_id} className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 cursor-pointer">
                      <Checkbox
                        checked={selectedMembers.includes(p.user_id)}
                        onCheckedChange={(checked) => {
                          setSelectedMembers(prev =>
                            checked ? [...prev, p.user_id] : prev.filter(id => id !== p.user_id)
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Annuler</Button>
              <Button onClick={saveGroup} disabled={!groupName.trim()}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete group confirm */}
        <AlertDialog open={!!deleteGroupTarget} onOpenChange={(o) => !o && setDeleteGroupTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le groupe « {deleteGroupTarget?.name} » ?</AlertDialogTitle>
              <AlertDialogDescription>Tous les messages du groupe seront supprimés.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Members management */}
        <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Membres du groupe</DialogTitle></DialogHeader>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {target?.type === "group" && groupMembers
                .filter(gm => gm.group_id === target.id)
                .map(gm => {
                  const p = getProfileById(gm.user_id);
                  return (
                    <div key={gm.user_id} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-secondary/50">
                      <Avatar className="h-8 w-8">
                        {p?.avatar_url && <AvatarImage src={p.avatar_url} />}
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(p?.display_name || "U")}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1">{p?.display_name || "Utilisateur"}</span>
                      {gm.user_id === user?.id && <Badge variant="secondary" className="text-[10px]">Vous</Badge>}
                      {gm.user_id !== user?.id && isGroupCreator && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
                          await supabase.from("conversation_group_members").delete().eq("group_id", target.id).eq("user_id", gm.user_id);
                          toast.success("Membre retiré");
                          loadData();
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

  return (
    <AppLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <FontAwesomeIcon icon={faComments} className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Messagerie</h1>
        </div>

        <div className="flex-1 flex rounded-xl overflow-hidden border border-border bg-card shadow-sm min-h-0">
          {showContacts && <Sidebar />}

          {showConversation && (
            <div className="flex-1 flex flex-col min-w-0">
              {target ? (
                <>
                  <ConversationHeader />
                  <MessagesArea />
                  <InputArea />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faComments} className="h-9 w-9 text-primary/30" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Messagerie DynaPerf</p>
                  <p className="text-xs text-muted-foreground max-w-[240px]">
                    Sélectionnez un contact ou un groupe pour démarrer une conversation
                  </p>
                  <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={openNewGroup}>
                    <FontAwesomeIcon icon={faPlus} className="h-3 w-3" /> Créer un groupe
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Dialogs />
    </AppLayout>
  );
}
