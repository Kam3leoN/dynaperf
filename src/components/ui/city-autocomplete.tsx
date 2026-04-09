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
  onEnterSubmit?: () => void;
}

const FALLBACK_CITY_API = "https://geo.api.gouv.fr/communes";
const MAX_RESULTS = 15;

function normalizeQuery(query: string) {
  return query
    .trim()
    .replace(/\s*\(.*\)\s*$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function dedupeCities(cities: CityResult[]) {
  const seen = new Set<string>();
  return cities.filter((city) => {
    const key = `${city.name}|${city.postal_code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchFallbackCities(cleaned: string, isPostalSearch: boolean) {
  const params = new URLSearchParams({
    fields: "nom,codeDepartement,codesPostaux",
    boost: "population",
    limit: String(MAX_RESULTS),
  });

  if (isPostalSearch) {
    params.set("codePostal", cleaned);
  } else {
    params.set("nom", cleaned);
  }

  const response = await fetch(`${FALLBACK_CITY_API}?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Fallback city API request failed");
  }

  const data = (await response.json()) as Array<{
    nom: string;
    codeDepartement?: string;
    codesPostaux?: string[];
  }>;

  return dedupeCities(
    data.flatMap((city) =>
      (city.codesPostaux?.length ? city.codesPostaux : [""]).map((postal_code) => ({
        name: city.nom,
        postal_code,
        department: city.codeDepartement ?? null,
      }))
    )
  ).slice(0, MAX_RESULTS);
}

export function CityAutocomplete({ value, onChange, placeholder, className, onEnterSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const justSelectedRef = useRef(false);
  const requestIdRef = useRef(0);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const cleaned = normalizeQuery(trimmed);
    if (cleaned.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const isPostalSearch = /^\d+$/.test(cleaned);
    setLoading(true);
    setOpen(true);

    try {
      const { data, error } = isPostalSearch
        ? await supabase
            .from("french_cities")
            .select("name, postal_code, department")
            .like("postal_code", `${cleaned}%`)
            .order("postal_code")
            .order("name")
            .limit(MAX_RESULTS)
        : await supabase
            .from("french_cities")
            .select("name, postal_code, department")
            .or(`name.ilike.${cleaned}%,name.ilike.% ${cleaned}%`)
            .order("name")
            .limit(MAX_RESULTS);

      if (requestId !== requestIdRef.current) return;

      if (error) {
        const fallbackResults = await searchFallbackCities(cleaned, isPostalSearch);
        if (requestId !== requestIdRef.current) return;
        setResults(fallbackResults);
      } else {
        const cities = dedupeCities((data as CityResult[]) || []);
        if (cities.length > 0) {
          setResults(cities);
        } else {
          const fallbackResults = await searchFallbackCities(cleaned, isPostalSearch);
          if (requestId !== requestIdRef.current) return;
          setResults(fallbackResults);
        }
      }

      setHighlightIdx(-1);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setResults([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 120);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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

  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("button");
      items[highlightIdx]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  const selectCity = (city: CityResult) => {
    justSelectedRef.current = true;
    onChange(`${city.name} (${city.postal_code})`);
    setOpen(false);
    setResults([]);
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
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectCity(results[highlightIdx >= 0 ? highlightIdx : 0]);
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
          setOpen(e.target.value.trim().length >= 2);
        }}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
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
              key={`${city.postal_code}-${city.name}-${i}`}
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
              <span className="font-mono text-xs text-muted-foreground">{city.postal_code}</span>
            </button>
          ))}
        </div>
      )}
      {open && loading && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          Recherche…
        </div>
      )}
      {open && !loading && results.length === 0 && value.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          Aucune ville trouvée
        </div>
      )}
    </div>
  );
}
