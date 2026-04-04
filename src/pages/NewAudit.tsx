import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AUDIT_TYPE_OPTIONS } from "@/data/auditTypes";
import { AuditTypeSearchCombobox } from "@/components/audit/AuditTypeSearchCombobox";

/** Colonnes de la grille `.grid-action` : 2 &lt; sm, 3 à partir de sm (640px). */
function useAuditTypeGridColumns() {
  const [cols, setCols] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches ? 3 : 2
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setCols(mq.matches ? 3 : 2);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return cols;
}

export default function NewAudit() {
  const navigate = useNavigate();
  const cols = useAuditTypeGridColumns();
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const goToType = useCallback(
    (typeKey: string) => {
      navigate(`/audits/new/version?type=${encodeURIComponent(typeKey)}`);
    },
    [navigate]
  );

  const focusButton = (index: number) => {
    const el = buttonsRef.current[index];
    el?.focus();
  };

  const onTypeCardKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const n = AUDIT_TYPE_OPTIONS.length;
    let next: number | null = null;
    const col = index % cols;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        if (col < cols - 1 && index + 1 < n) next = index + 1;
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (col > 0) next = index - 1;
        break;
      case "ArrowDown":
        e.preventDefault();
        if (index + cols < n) next = index + cols;
        break;
      case "ArrowUp":
        e.preventDefault();
        if (index - cols >= 0) next = index - cols;
        break;
      case "Home":
        e.preventDefault();
        next = 0;
        break;
      case "End":
        e.preventDefault();
        next = n - 1;
        break;
      default:
        break;
    }
    if (next !== null) focusButton(next);
  };

  return (
    <AppLayout>
      <div className="py-10 sm:py-16 px-4">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-foreground">Nouvel audit</h2>
          <p className="text-muted-foreground text-sm mt-1">Sélectionnez le type d&apos;événement</p>
        </div>

        <AuditTypeSearchCombobox types={AUDIT_TYPE_OPTIONS} onSelectType={goToType} className="mb-10" />

        <p className="text-center text-xs text-muted-foreground mb-4 hidden sm:block">
          Ou choisissez une carte — utilisez Tab et les flèches pour naviguer
        </p>

        <div
          className="grid-action max-w-3xl mx-auto"
          role="toolbar"
          aria-label="Types d'événement"
        >
          {AUDIT_TYPE_OPTIONS.map((type, index) => (
            <button
              key={type.key}
              ref={(el) => {
                buttonsRef.current[index] = el;
              }}
              type="button"
              onClick={() => goToType(type.key)}
              onKeyDown={(e) => onTypeCardKeyDown(e, index)}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:shadow-hover hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ "--card-accent": type.color } as React.CSSProperties}
            >
              <div
                className="flex items-center justify-center w-12 h-12 rounded-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${type.color}18` }}
              >
                <div
                  className="h-6 w-6"
                  style={{
                    backgroundColor: type.color,
                    mask: `url(${type.icon}) no-repeat center / contain`,
                    WebkitMask: `url(${type.icon}) no-repeat center / contain`,
                  }}
                />
              </div>
              {type.desktopLabel ? (
                <>
                  <span className="text-sm font-medium text-foreground text-center leading-snug lg:hidden">
                    {type.label}
                  </span>
                  <span className="text-sm font-medium text-foreground text-center leading-snug hidden lg:block">
                    {type.desktopLabel}
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-foreground text-center leading-snug">
                  {type.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
