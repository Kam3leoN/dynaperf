import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faPaperPlane, faCircle } from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

export default function Messages() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
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

  // Realtime subscription
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

  // Mark as read when viewing conversation
  useEffect(() => {
    if (!user || !selectedUserId) return;
    const unread = messages.filter(m => m.sender_id === selectedUserId && m.recipient_id === user.id && !m.read);
    unread.forEach(m => {
      supabase.from("messages").update({ read: true }).eq("id", m.id).then();
    });
  }, [selectedUserId, messages, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, selectedUserId]);

  const conversation = messages.filter(m =>
    (m.sender_id === user?.id && m.recipient_id === selectedUserId) ||
    (m.sender_id === selectedUserId && m.recipient_id === user?.id)
  );

  const getUnreadCount = (userId: string) =>
    messages.filter(m => m.sender_id === userId && m.recipient_id === user?.id && !m.read).length;

  // Contacts sorted by last message
  const contacts = profiles
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

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FontAwesomeIcon icon={faComments} className="h-5 w-5 text-primary" />
          Messagerie
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4" style={{ height: "calc(100vh - 200px)" }}>
          {/* Contacts list */}
          <Card className="overflow-hidden">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Contacts</CardTitle>
            </CardHeader>
            <ScrollArea className="h-[calc(100%-52px)]">
              <div className="space-y-0.5 p-2">
                {contacts.map(p => {
                  const unread = getUnreadCount(p.user_id);
                  return (
                    <button
                      key={p.user_id}
                      onClick={() => setSelectedUserId(p.user_id)}
                      className={`w-full text-left px-3 py-2.5 rounded-md transition-colors text-sm ${
                        selectedUserId === p.user_id ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{p.display_name || "Utilisateur"}</span>
                        {unread > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-[20px] flex items-center justify-center">
                            {unread}
                          </Badge>
                        )}
                      </div>
                      {p.lastMsg && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {p.lastMsg.content.slice(0, 40)}{p.lastMsg.content.length > 40 ? "…" : ""}
                        </p>
                      )}
                    </button>
                  );
                })}
                {contacts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun contact disponible</p>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Conversation */}
          <Card className="flex flex-col overflow-hidden">
            {selectedUserId ? (
              <>
                <CardHeader className="py-3 px-4 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FontAwesomeIcon icon={faCircle} className="h-2 w-2 text-green-500" />
                    {selectedProfile?.display_name || "Utilisateur"}
                  </CardTitle>
                </CardHeader>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {conversation.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Démarrez la conversation…</p>
                  )}
                  {conversation.map(m => {
                    const isMine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                          isMine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-secondary text-secondary-foreground rounded-bl-sm"
                        }`}>
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {format(new Date(m.created_at), "HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 border-t flex gap-2">
                  <Textarea
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="Votre message…"
                    className="min-h-[40px] max-h-[100px] resize-none text-sm"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!newMsg.trim() || sending}>
                    <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Sélectionnez un contact pour démarrer une conversation
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
