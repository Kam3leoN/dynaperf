import { AppLayout } from "@/components/AppLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCheck } from "@fortawesome/free-solid-svg-icons";

export default function Notifications() {
  // Placeholder: future real notifications from DB
  const notifications: { id: string; title: string; body: string; date: string; read: boolean }[] = [];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FontAwesomeIcon icon={faBell} className="h-5 w-5 text-primary" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vos dernières notifications.
          </p>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FontAwesomeIcon icon={faCheck} className="h-7 w-7 text-primary/40" />
            </div>
            <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`rounded-2xl p-4 border transition-colors ${n.read ? "bg-card border-border/60" : "bg-primary/5 border-primary/20"}`}>
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{n.date}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
