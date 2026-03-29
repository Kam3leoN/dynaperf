import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faComments, faSearch, faArrowLeft, faCheck, faCheckDouble } from "@fortawesome/free-solid-svg-icons";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

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

export default function Messages() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [profilesRes, msgsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url"),
      supabase.from("messages").select("*").order("created_at", { ascending: true }),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data.filter((p: any) => p.user_id !== user.id));
    if (msgsRes.data) setMessages(msgsRes.data as any);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMessages(prev => [...prev, payload.new as Message]);
        } else if (payload.eventType === "UPDATE") {
          setMessages(prev => prev.map(m => m.id === (payload.new as Message).id ? payload.new as Message : m));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user || !selectedUserId) return;
    const unread = messages.filter(m => m.sender_id === selectedUserId && m.recipient_id === user.id && !m.read);
    unread.forEach(m => {
      supabase.from("messages").update({ read: true }).eq("id", m.id).then();
    });
  }, [selectedUserId, messages, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, selectedUserId]);

  const conversation = messages.filter(m =>
    (m.sender_id === user?.id && m.recipient_id === selectedUserId) ||
    (m.sender_id === selectedUserId && m.recipient_id === user?.id)
  );

  const getUnreadCount = (userId: string) =>
    messages.filter(m => m.sender_id === userId && m.recipient_id === user?.id && !m.read).length;

  const contacts = profiles
    .filter(p => {
      if (!search.trim()) return true;
      return (p.display_name || "").toLowerCase().includes(search.toLowerCase());
    })
    .map(p => {
      const lastMsg = messages
        .filter(m => (m.sender_id === p.user_id && m.recipient_id === user?.id) || (m.sender_id === user?.id && m.recipient_id === p.user_id))
        .at(-1);
      return { ...p, lastMsg };
    })
    .sort((a, b) => {
      if (!a.lastMsg && !b.lastMsg) return 0;
      if (!a.lastMsg) return 1;
      if (!b.lastMsg) return -1;
      return new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime();
    });

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedUserId || !user) return;
    setSending(true);
    await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: selectedUserId,
      content: newMsg.trim(),
    });
    setNewMsg("");
    setSending(false);
  };

  const selectedProfile = profiles.find(p => p.user_id === selectedUserId);
  const showConversation = isMobile ? !!selectedUserId : true;
  const showContacts = isMobile ? !selectedUserId : true;

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

  // Mobile conversation view: full-screen between top nav and bottom nav
  if (isMobile && selectedUserId) {
    return (
      <AppLayout>
        <div className="fixed inset-0 top-16 bottom-[68px] z-30 flex flex-col bg-background">
          {/* Sticky conversation header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
            <button onClick={() => setSelectedUserId(null)} className="text-muted-foreground hover:text-foreground">
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            </button>
            <Avatar className="h-9 w-9">
              {selectedProfile?.avatar_url && <AvatarImage src={selectedProfile.avatar_url} />}
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                {getInitials(selectedProfile?.display_name || "U")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedProfile?.display_name || "Utilisateur"}</p>
              <p className="text-[10px] text-muted-foreground">En ligne</p>
            </div>
          </div>

          {/* Scrollable messages */}
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
                {group.msgs.map((m, i) => {
                  const isMine = m.sender_id === user?.id;
                  const showTail = i === 0 || group.msgs[i - 1].sender_id !== m.sender_id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"} ${showTail ? "mt-2" : "mt-0.5"}`}>
                      <div
                        className={`max-w-[80%] px-3 py-1.5 text-sm shadow-sm ${
                          isMine
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                            : "bg-card text-card-foreground border border-border/50 rounded-2xl rounded-bl-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                        <div className={`flex items-center gap-1 justify-end mt-0.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                          <span className="text-[10px]">{format(new Date(m.created_at), "HH:mm")}</span>
                          {isMine && (
                            <FontAwesomeIcon
                              icon={m.read ? faCheckDouble : faCheck}
                              className={`h-2.5 w-2.5 ${m.read ? "text-blue-300" : ""}`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sticky input at bottom */}
          <div className="px-3 py-2.5 border-t border-border bg-card flex items-end gap-2 shrink-0">
            <Textarea
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              placeholder="Écrivez un message…"
              className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl bg-secondary border-none focus-visible:ring-1 focus-visible:ring-primary/30"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
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
        </div>
      </AppLayout>
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
          {/* Sidebar contacts */}
          {showContacts && (
            <div className={`${isMobile ? "w-full" : "w-[320px]"} flex flex-col border-r border-border bg-card`}>
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="divide-y divide-border/50">
                  {contacts.map(p => {
                    const unread = getUnreadCount(p.user_id);
                    const isActive = selectedUserId === p.user_id;
                    const displayName = p.display_name || "Utilisateur";
                    return (
                      <button
                        key={p.user_id}
                        onClick={() => setSelectedUserId(p.user_id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 transition-colors text-left ${
                          isActive ? "bg-primary/10" : "hover:bg-secondary/80"
                        }`}
                      >
                        <Avatar className="h-11 w-11 shrink-0">
                          {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                              {displayName}
                            </span>
                            {p.lastMsg && (
                              <span className="text-[10px] text-muted-foreground ml-1 shrink-0">
                                {format(new Date(p.lastMsg.created_at), "HH:mm")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-muted-foreground truncate pr-2">
                              {p.lastMsg
                                ? (p.lastMsg.sender_id === user?.id ? "Vous : " : "") + p.lastMsg.content.slice(0, 35) + (p.lastMsg.content.length > 35 ? "…" : "")
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
                  })}
                  {contacts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Aucun contact</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Desktop conversation panel */}
          {showConversation && (
            <div className="flex-1 flex flex-col min-w-0">
              {selectedUserId ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                    <Avatar className="h-9 w-9">
                      {selectedProfile?.avatar_url && <AvatarImage src={selectedProfile.avatar_url} />}
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                        {getInitials(selectedProfile?.display_name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedProfile?.display_name || "Utilisateur"}</p>
                      <p className="text-[10px] text-muted-foreground">En ligne</p>
                    </div>
                  </div>

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
                        {group.msgs.map((m, i) => {
                          const isMine = m.sender_id === user?.id;
                          const showTail = i === 0 || group.msgs[i - 1].sender_id !== m.sender_id;
                          return (
                            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"} ${showTail ? "mt-2" : "mt-0.5"}`}>
                              <div
                                className={`max-w-[80%] px-3 py-1.5 text-sm shadow-sm ${
                                  isMine
                                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                                    : "bg-card text-card-foreground border border-border/50 rounded-2xl rounded-bl-md"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                                <div className={`flex items-center gap-1 justify-end mt-0.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                                  <span className="text-[10px]">{format(new Date(m.created_at), "HH:mm")}</span>
                                  {isMine && (
                                    <FontAwesomeIcon
                                      icon={m.read ? faCheckDouble : faCheck}
                                      className={`h-2.5 w-2.5 ${m.read ? "text-blue-300" : ""}`}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <div className="px-3 py-2.5 border-t border-border bg-card flex items-end gap-2">
                    <Textarea
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      placeholder="Écrivez un message…"
                      className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl bg-secondary border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
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
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faComments} className="h-9 w-9 text-primary/30" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Messagerie DynaPerf</p>
                  <p className="text-xs text-muted-foreground max-w-[240px]">
                    Sélectionnez un contact pour démarrer une conversation en temps réel
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
