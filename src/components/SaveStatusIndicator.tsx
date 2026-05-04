import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faSpinner, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

interface Props {
  status: 'idle' | 'saving' | 'saved' | 'error';
}

export function SaveStatusIndicator({ status }: Props) {
  if (status === 'idle') return null;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full transition-all duration-m3-standard ease-m3-standard",
      status === 'saving' && "text-muted-foreground bg-muted",
      status === 'saved' && "text-emerald-600 bg-emerald-500/10",
      status === 'error' && "text-destructive bg-destructive/10",
    )}>
      {status === 'saving' && (
        <>
          <FontAwesomeIcon icon={faSpinner} className="h-2.5 w-2.5 animate-spin" />
          Sauvegarde…
        </>
      )}
      {status === 'saved' && (
        <>
          <FontAwesomeIcon icon={faCircleCheck} className="h-2.5 w-2.5" />
          Sauvegardé
        </>
      )}
      {status === 'error' && (
        <>
          <FontAwesomeIcon icon={faTriangleExclamation} className="h-2.5 w-2.5" />
          Erreur
        </>
      )}
    </span>
  );
}
