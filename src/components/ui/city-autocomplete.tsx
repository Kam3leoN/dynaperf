import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cnDropdownListRow } from "@/lib/dropdownListItem";
import { supabase } from "@/integrations/supabase/client";

interface CityResult {
  name: string;
  postal_code: string;
  department: string | null;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Quand la liste est fermée, Entrée déclenche cette action (ex. enregistrer le formulaire). */
  onEnterSubmit?: () => void;
}

export function CityAutocomplete({ value, onChange, placeholder, className, onEnterSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const isPostalSearch = /^\d+$/.test(query);
    const { data } = isPostalSearch
      ? await supabase
          .from("french_cities")
          .select("name, postal_code, department")
          .like("postal_code", `${query}%`)
          .order("name")
          .limit(12)
      : await supabase
          .from("french_cities")
          .select("name, postal_code, department")
          .ilike("name", `%${query}%`)
          .order("name")
          .limit(12);

    setResults((data as CityResult[]) || []);
    setHighlightIdx(-1);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("button");
      items[highlightIdx]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  const selectCity = (city: CityResult) => {
    onChange(`${city.name} (${city.postal_code})`);
    setOpen(false);
    setHighlightIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !open && onEnterSubmit) {
      e.preventDefault();
      onEnterSubmit();
      return;
    }

    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      selectCity(results[highlightIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value.length >= 2 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {results.map((city, i) => (
            <button
              key={`${city.postal_code}-${i}`}
              type="button"
              className={cn(
                "flex w-full items-center justify-between px-3 py-2.5 text-left focus:outline-none",
                cnDropdownListRow(highlightIdx === i)
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectCity(city);
              }}
            >
              <span>{city.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{city.postal_code}</span>
            </button>
          ))}
        </div>
      )}
      {open && loading && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
          Recherche…
        </div>
      )}
    </div>
  );
}
