import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
}

export function CityAutocomplete({ value, onChange, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);

    // Search by name or postal code
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

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value.length >= 2 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-md max-h-56 overflow-y-auto">
          {results.map((city, i) => (
            <button
              key={`${city.postal_code}-${i}`}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors",
                "focus:bg-accent/50 focus:outline-none flex items-center justify-between"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(`${city.name} (${city.postal_code})`);
                setOpen(false);
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
