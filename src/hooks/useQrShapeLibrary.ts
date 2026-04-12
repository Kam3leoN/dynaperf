import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { QrShapeLibraryRow } from "@/lib/qrShapeMarkup";

/**
 * Catalogue `qr_shape_library` (actifs), indexé par id pour le rendu QR.
 */
export function useQrShapeLibraryMap() {
  const query = useQuery({
    queryKey: ["qr-shape-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_shape_library")
        .select("id, kind, name, svg_markup, legacy_key, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as QrShapeLibraryRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const byId = useMemo(() => {
    const m = new Map<string, QrShapeLibraryRow>();
    for (const r of query.data ?? []) {
      m.set(r.id, r);
    }
    return m;
  }, [query.data]);

  const byKind = useMemo(() => {
    const d: QrShapeLibraryRow[] = [];
    const c: QrShapeLibraryRow[] = [];
    const v: QrShapeLibraryRow[] = [];
    for (const r of query.data ?? []) {
      if (r.kind === "dot") d.push(r);
      else if (r.kind === "corner") c.push(r);
      else v.push(r);
    }
    return { dot: d, corner: c, cover: v };
  }, [query.data]);

  return { ...query, byId, byKind };
}
