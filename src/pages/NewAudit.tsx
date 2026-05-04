import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { AppLayout } from "@/components/AppLayout";
import { AUDIT_TYPE_OPTIONS } from "@/data/auditTypes";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Aligné sur `sm:grid-cols-2` : 1 colonne &lt; sm, 2 colonnes à partir de sm. */
function useAuditTypeGridColumns(): number {
  const [cols, setCols] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 640px)").matches ? 2 : 1
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setCols(mq.matches ? 2 : 1);
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
    [navigate],
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

  const navCardClassName = cn(
    "h-full border-border/60 bg-card shadow-soft transition-all duration-m3-standard ease-m3-standard",
    "hover:border-primary/35 hover:shadow-hover hover:-translate-y-0.5",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 pb-8">
        <header>
          <h1 className="text-6xl font-bold tracking-tight text-foreground sm:text-7xl">Nouvel audit</h1>
          <p className="text-muted-foreground m3-body-large mt-2">Sélectionnez le type d&apos;événement</p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4" role="toolbar" aria-label="Types d'événement">
          {AUDIT_TYPE_OPTIONS.map((type, index) => (
            <button
              key={type.key}
              ref={(el) => {
                buttonsRef.current[index] = el;
              }}
              type="button"
              onClick={() => goToType(type.key)}
              onKeyDown={(e) => onTypeCardKeyDown(e, index)}
              className="group block min-w-0 w-full cursor-pointer text-left"
            >
              <Card className={navCardClassName}>
                <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
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
                  <div className="min-w-0 flex-1">
                    {type.desktopLabel ? (
                      <>
                        <p className="font-semibold text-foreground leading-snug transition-colors group-hover:text-primary shell:hidden">
                          {type.label}
                        </p>
                        <p className="font-semibold text-foreground leading-snug transition-colors group-hover:text-primary hidden shell:block">
                          {type.desktopLabel}
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold text-foreground leading-snug transition-colors group-hover:text-primary">
                        {type.label}
                      </p>
                    )}
                  </div>
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
