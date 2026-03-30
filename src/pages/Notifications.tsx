import { AppLayout } from "@/components/AppLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCheck, faCheckDouble } from "@fortawesome/free-solid-svg-icons";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <FontAwesomeIcon icon={faBell} className="h-5 w-5 text-primary" />
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vos dernières notifications.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs gap-1.5">
              <FontAwesomeIcon icon={faCheckDouble} className="h-3 w-3" />
              Tout lire
            </Button>
          )}
        </div>

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
            {notifications.map(n => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`w-full text-left rounded-2xl p-4 border transition-colors ${
                  n.read
                    ? "bg-card border-border/60"
                    : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  </div>
                  {!n.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {format(new Date(n.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
