import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { cnDropdownListRow } from "@/lib/dropdownListItem";
import type { AuditTypeOption } from "@/data/auditTypes";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

interface AuditTypeSearchComboboxProps {
  types: AuditTypeOption[];
  onSelectType: (typeKey: string) => void;
  className?: string;
}

/**
 * Champ de recherche + liste des types d'audit avec filtrage et navigation clavier
 * (flèches, Entrée, Échap, Début/Fin).
 */
export function AuditTypeSearchCombobox({
  types,
  onSelectType,
  className,
}: AuditTypeSearchComboboxProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return types;
    return types.filter((t) => {
      const label = normalize(t.label);
      const key = normalize(t.key);
      return label.includes(q) || key.includes(q);
    });
  }, [query, types]);

  useEffect(() => {
    setHighlighted((h) => {
      if (filtered.length === 0) return 0;
      return Math.min(h, filtered.length - 1);
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!open || filtered.length === 0) return;
    const el = listRef.current?.querySelector(`[data-option-index="${highlighted}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open, filtered.length]);

  const pick = useCallback(
    (typeKey: string) => {
      onSelectType(typeKey);
      setQuery("");
      setOpen(false);
      setHighlighted(0);
      inputRef.current?.blur();
    },
    [onSelectType]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && filtered.length > 0) {
      e.preventDefault();
      setOpen(true);
      setHighlighted(e.key === "ArrowDown" ? 0 : filtered.length - 1);
      return;
    }

    if (!open || filtered.length === 0) {
      if (e.key === "Escape") {
        setQuery("");
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setHighlighted((i) => (i + 1) % filtered.length);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setHighlighted((i) => (i - 1 + filtered.length) % filtered.length);
        break;
      }
      case "Home": {
        e.preventDefault();
        setHighlighted(0);
        break;
      }
      case "End": {
        e.preventDefault();
        setHighlighted(filtered.length - 1);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const t = filtered[highlighted];
        if (t) pick(t.key);
        break;
      }
      case "Escape": {
        e.preventDefault();
        setOpen(false);
        setHighlighted(0);
        break;
      }
      default:
        break;
    }
  };

  const listboxVisible = open && filtered.length > 0;

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <Label htmlFor={listId + "-input"} className="text-sm text-muted-foreground sr-only">
        Rechercher un type d&apos;événement
      </Label>
      <Input
        ref={inputRef}
        id={listId + "-input"}
        type="search"
        role="combobox"
        aria-expanded={listboxVisible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={listboxVisible ? `${listId}-opt-${highlighted}` : undefined}
        autoComplete="off"
        placeholder="Rechercher un type d'événement…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-11"
      />
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Flèches pour parcourir, Entrée pour valider, Échap pour fermer la liste
      </p>
      {listboxVisible && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="mt-2 flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-left shadow-md"
        >
          {filtered.map((t, i) => (
            <div
              key={t.key}
              id={`${listId}-opt-${i}`}
              data-option-index={i}
              role="option"
              aria-selected={highlighted === i}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-2.5",
                cnDropdownListRow(highlighted === i)
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(t.key);
              }}
              onMouseEnter={() => setHighlighted(i)}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: t.color }}
                aria-hidden
              />
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
