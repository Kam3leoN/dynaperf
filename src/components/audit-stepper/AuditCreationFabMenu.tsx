import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faEllipsisVertical, faFloppyDisk, faXmark } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { runMorphTransition } from "@/lib/morphTransition";

/** Durée max. fermeture : animation 380ms + décalage sortie (1 × 40ms) + marge. */
const SPEED_DIAL_CLOSE_MS = 460;

export interface AuditCreationFabMenuProps {
  /** Désactive « Sauvegarder » (ex. pas encore d’infos générales). */
  saveDisabled?: boolean;
  /** Enregistrement serveur + brouillon local — ne pas naviguer. */
  onSaveProgress: () => void | Promise<void>;
  /** Fait défiler la page en haut ; peut être async pour attendre la fin du scroll avant fermeture. */
  onScrollTop: () => void | Promise<void>;
  /** Indique une sauvegarde en cours (désactive les actions du menu). */
  saving?: boolean;
}

/** Pastilles 56×min (hauteur 56px M3), capsule `rounded-full` ; morph shape via `.m3-morph-shape`. */
const pillBase =
  "audit-fab-speed-dial__pill m3-morph-shape inline-flex h-[56px] min-h-[56px] shrink-0 items-center gap-3 rounded-full pl-4 pr-5 text-base font-medium leading-none " +
  "bg-[hsl(var(--m3-primary-container))] text-[hsl(var(--m3-on-primary-container))] " +
  "shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-hover)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-[0.38]";

const pillStyleEnterExit = (
  enterStagger: number,
  exitStagger: number,
  viewTransitionName: "audit-fab-pill-save" | "audit-fab-pill-up",
): CSSProperties =>
  ({
    "--m3-speed-dial-stagger": enterStagger,
    "--m3-speed-dial-exit-stagger": exitStagger,
    viewTransitionName,
  }) as CSSProperties;

/**
 * Speed dial 56×56 (spec M3), rayon 16px fermé, rond ouvert + neutre ;
 * pastilles primary ; entrée / sortie depuis la droite (sortie inversée, stagger inversé).
 */
export function AuditCreationFabMenu({
  saveDisabled = false,
  onSaveProgress,
  onScrollTop,
  saving = false,
}: AuditCreationFabMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuExiting, setMenuExiting] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const menuId = useId();

  const beginClose = useCallback(() => {
    if (menuExiting) return;
    if (!open) return;
    setMenuExiting(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      runMorphTransition(() => {
        setOpen(false);
        setMenuExiting(false);
      });
      closeTimerRef.current = null;
    }, SPEED_DIAL_CLOSE_MS);
  }, [open, menuExiting]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        beginClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, beginClose]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | PointerEvent) => {
      const el = wrapRef.current;
      if (!el?.contains(e.target as Node)) beginClose();
    };
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, [open, beginClose]);

  const handleSave = async () => {
    if (saveDisabled || saving) return;
    await onSaveProgress();
    beginClose();
  };

  const handleTop = () => {
    void Promise.resolve(onScrollTop()).then(() => {
      requestAnimationFrame(() => {
        beginClose();
      });
    });
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[58] bg-foreground/20 backdrop-blur-[1px] shell:bg-foreground/15"
          aria-hidden
          onClick={beginClose}
        />
      )}

      <div
        ref={wrapRef}
        className={cn(
          "fixed z-[60] flex flex-col-reverse items-end gap-1",
          "right-[max(1rem,env(safe-area-inset-right,0px))] bottom-24",
          "shell:bottom-[max(1rem,env(safe-area-inset-bottom,0px))] shell:right-[max(1rem,env(safe-area-inset-right,0px))]",
        )}
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open ? menuId : undefined}
          title={open ? "Fermer le menu" : "Actions de sauvegarde et navigation"}
          disabled={saving}
          onClick={() => {
            if (saving || menuExiting) return;
            if (open) beginClose();
            else runMorphTransition(() => setOpen(true));
          }}
          style={{ viewTransitionName: "audit-fab-trigger" } as CSSProperties}
          className={cn(
            "m3-morph-shape flex h-14 w-14 shrink-0 items-center justify-center",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:pointer-events-none disabled:opacity-[0.38]",
            /* M3 FAB 56×56 : rayon 16px fermé → rond ouvert (morph) */
            open
              ? "rounded-full border border-border/60 bg-[hsl(var(--surface-container-highest))] text-foreground shadow-[var(--shadow-soft)]"
              : "rounded-[16px] border border-primary/25 bg-primary text-primary-foreground shadow-[var(--shadow-elevated)] hover:brightness-105",
          )}
        >
          <FontAwesomeIcon
            icon={open ? faXmark : faEllipsisVertical}
            className="h-6 w-6"
            aria-hidden
          />
        </button>

        {open && (
          <div
            id={menuId}
            role="menu"
            aria-label="Actions audit"
            className="flex max-w-[min(100vw-2.5rem,320px)] flex-col items-end gap-1"
          >
            <button
              type="button"
              role="menuitem"
              style={pillStyleEnterExit(1, 0, "audit-fab-pill-save")}
              disabled={saveDisabled || saving || menuExiting}
              onClick={() => void handleSave()}
              className={cn(pillBase, menuExiting && "audit-fab-speed-dial__pill--exiting")}
            >
              <FontAwesomeIcon icon={faFloppyDisk} className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
              Sauvegarder
            </button>
            <button
              type="button"
              role="menuitem"
              style={pillStyleEnterExit(0, 1, "audit-fab-pill-up")}
              disabled={saving || menuExiting}
              onClick={handleTop}
              className={cn(pillBase, menuExiting && "audit-fab-speed-dial__pill--exiting")}
            >
              <FontAwesomeIcon icon={faArrowUp} className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
              Remonter
            </button>
          </div>
        )}
      </div>
    </>
  );
}
