import { AppLayout } from "@/components/AppLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCheckDouble, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ActionIconButton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        {unreadCount > 0 && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs gap-1.5">
              <FontAwesomeIcon icon={faCheckDouble} className="h-3 w-3" />
              Tout lire
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FontAwesomeIcon icon={faCheck} className="h-7 w-7 text-primary/40" />
            </div>
            <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-center gap-1 rounded-2xl border transition-colors sm:gap-2 ${
                  n.read ? "bg-card border-border/60" : "bg-primary/5 border-primary/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read) markAsRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                  className="min-w-0 flex-1 rounded-2xl p-4 text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    </div>
                    {!n.read && (
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    )}
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {format(new Date(n.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                  </p>
                </button>
                {n.read && (
                  <div className="flex shrink-0 items-center self-stretch pr-2 sm:pr-3" onClick={(e) => e.stopPropagation()}>
                    <ActionIconButton
                      label="Supprimer la notification"
                      variant="destructive"
                      className="h-9 w-9"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void deleteNotification(n.id);
                      }}
                    >
                      <FontAwesomeIcon icon={faTrashCan} className="h-4 w-4" />
                    </ActionIconButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
