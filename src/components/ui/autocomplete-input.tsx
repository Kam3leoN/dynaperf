import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cnDropdownListRow } from "@/lib/dropdownListItem";

interface Props {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  type?: string;
  min?: number;
  /** Quand la liste est fermée, Entrée déclenche cette action (ex. enregistrer le formulaire). */
  onEnterSubmit?: () => void;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  type = "text",
  min,
  onEnterSubmit,
}: Props) {
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.trim()) {
      setFiltered(suggestions.slice(0, 8));
    } else {
      const lower = value.toLowerCase();
      setFiltered(
        suggestions
          .filter((s) => s.toLowerCase().includes(lower) && s.toLowerCase() !== lower)
          .slice(0, 8)
      );
    }
  }, [value, suggestions]);

  useEffect(() => {
    setHighlighted((h) => {
      if (filtered.length === 0) return 0;
      return Math.min(h, filtered.length - 1);
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!open || filtered.length === 0) return;
    const el = listRef.current?.querySelector(`[data-ac-index="${highlighted}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open, filtered.length]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectItem = useCallback(
    (item: string) => {
      onChange(item);
      setOpen(false);
      setHighlighted(0);
    },
    [onChange]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !open && onEnterSubmit) {
      e.preventDefault();
      onEnterSubmit();
      return;
    }

    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && filtered.length > 0) {
      e.preventDefault();
      setOpen(true);
      setHighlighted(e.key === "ArrowDown" ? 0 : filtered.length - 1);
      return;
    }

    if (!open || filtered.length === 0) {
      if (e.key === "Escape") {
        setOpen(false);
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
        const item = filtered[highlighted];
        if (item) selectItem(item);
        break;
      }
      case "Escape": {
        e.preventDefault();
        setOpen(false);
        break;
      }
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const listVisible = open && filtered.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Input
        type={type}
        min={min}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-expanded={listVisible}
        aria-controls={`${baseId}-list`}
        aria-autocomplete="list"
        aria-activedescendant={listVisible ? `${baseId}-opt-${highlighted}` : undefined}
      />
        {listVisible && (
        <div
          ref={listRef}
          id={`${baseId}-list`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {filtered.map((item, i) => (
            <div
              key={`${item}-${i}`}
              id={`${baseId}-opt-${i}`}
              data-ac-index={i}
              role="option"
              aria-selected={highlighted === i}
              className={cn(
                "w-full cursor-pointer px-3 py-2.5 text-left",
                cnDropdownListRow(highlighted === i)
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(item);
              }}
              onMouseEnter={() => setHighlighted(i)}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
