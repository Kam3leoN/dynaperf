import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWifi, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex gap-2">
      {!isOnline && (
        <Badge variant="destructive" className="gap-1.5 text-xs py-1 px-3 shadow-lg">
          <FontAwesomeIcon icon={faTriangleExclamation} className="h-3 w-3" />
          Hors-ligne
        </Badge>
      )}
      {pendingCount > 0 && (
        <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-3 shadow-lg">
          <FontAwesomeIcon icon={faWifi} className="h-3 w-3" />
          {pendingCount} en attente de sync
        </Badge>
      )}
    </div>
  );
}
