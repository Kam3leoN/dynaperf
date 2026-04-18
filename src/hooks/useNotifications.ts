import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

/**
 * Hook pour gérer les notifications en temps réel.
 * Charge les notifications de l'utilisateur et écoute les nouvelles via Realtime.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Écoute temps réel
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { fetchNotifications(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [user]);

  const deleteNotification = useCallback(
    async (id: string) => {
      if (!user) return;
      setNotifications((prev) => {
        const next = prev.filter((n) => n.id !== id);
        queueMicrotask(() => {
          setUnreadCount(next.filter((n) => !n.read).length);
        });
        return next;
      });
      const { error } = await supabase.from("notifications").delete().eq("id", id).eq("user_id", user.id);
      if (error) {
        console.error("[useNotifications] delete", error);
        void fetchNotifications();
      }
    },
    [user, fetchNotifications],
  );

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification };
}
