import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

const rootClass =
  "flex h-16 w-full shrink-0 items-center gap-2 px-4 shell:h-[4.25rem] shell:gap-3 shell:px-6";

const orderedRowClass =
  "flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5";

const defaultTitleClass =
  "min-w-0 max-w-full truncate text-base font-semibold leading-tight text-foreground";

const defaultMetaClass = "min-w-0 text-sm font-normal text-muted-foreground sm:truncate";

export type ContextSubHeaderProps = {
  className?: string;
  /** Bouton retour (ex. mobile). */
  onBack?: () => void;
  backButtonClassName?: string;
  /** Icône / avatar à gauche du bloc titre. */
  leading?: ReactNode;
  /**
   * Zone centrale (titre + méta + segments dynamiques).
   * Utiliser {@link ContextSubHeaderOrderedRow} + {@link ContextSubHeaderSlot} pour ordonner
   * plusieurs blocs (annuaire : filtre, compteur, etc.) via `order`.
   */
  children?: ReactNode;
  /** Raccourci si `children` est omis : titre principal (order implicite 0). */
  title?: ReactNode;
  /** Raccourci si `children` est omis : méta à droite du titre (order implicite 10). */
  meta?: ReactNode;
  /** Actions alignées à droite (menu ⋮, etc.). */
  actions?: ReactNode;
};

/**
 * Barre de contexte sous l’AppBar (salon, DM, annuaire…).
 * Réutilisable : combine `leading`, zone centrale (`children` ou `title`/`meta`), `actions`.
 */
export function ContextSubHeader({
  className,
  onBack,
  backButtonClassName,
  leading,
  children,
  title,
  meta,
  actions,
}: ContextSubHeaderProps) {
  const center =
    children ??
    (title != null || meta != null ? (
      <ContextSubHeaderOrderedRow>
        {title != null && (
          <ContextSubHeaderSlot order={0} className={defaultTitleClass}>
            {title}
          </ContextSubHeaderSlot>
        )}
        {meta != null && (
          <ContextSubHeaderSlot order={10} className={defaultMetaClass}>
            {meta}
          </ContextSubHeaderSlot>
        )}
      </ContextSubHeaderOrderedRow>
    ) : null);

  return (
    <div className={cn(rootClass, className)}>
      {onBack != null && (
        <button
          type="button"
          onClick={onBack}
          className={cn("text-muted-foreground hover:text-foreground", backButtonClassName)}
          aria-label="Retour"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
        </button>
      )}
      {leading}
      {center != null && <div className="min-w-0 flex-1">{center}</div>}
      {actions}
    </div>
  );
}

export type ContextSubHeaderOrderedRowProps = {
  className?: string;
  children?: ReactNode;
};

/**
 * Conteneur flex pour segments ordonnés (propriété CSS `order`).
 * Un segment avec `order={5}` s’affiche avant un segment `order={20}` ; en ajouter un avec `order={12}`
 * le place entre les deux sans réécrire les autres.
 */
export function ContextSubHeaderOrderedRow({ className, children }: ContextSubHeaderOrderedRowProps) {
  return <div className={cn(orderedRowClass, className)}>{children}</div>;
}

export type ContextSubHeaderSlotProps = {
  /**
   * Priorité d’affichage (flex `order`). Conseil : 0 titre, 10–90 méta / filtres, 100+ badges.
   * Même valeur = ordre navigateur (éviter les doublons).
   */
  order: number;
  className?: string;
  children?: ReactNode;
};

/** Segment dans {@link ContextSubHeaderOrderedRow} ; se positionne selon `order`. */
export function ContextSubHeaderSlot({ order, className, children }: ContextSubHeaderSlotProps) {
  return (
    <span className={cn("min-w-0", className)} style={{ order }}>
      {children}
    </span>
  );
}
