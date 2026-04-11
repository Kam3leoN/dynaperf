import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MapLibreModule = typeof import("maplibre-gl");

export type SecteurMapRow = {
  id: string;
  nom: string;
  departements: string[];
  color_hex: string | null;
};

const GEOJSON_URL =
  "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson";

const FALLBACK_UNASSIGNED = "#e4e4e7";

/** Calcule une emprise pour centrer la carte sur tous les polygones (France + DOM si présents). */
function boundsFromFeatureCollection(fc: GeoJSON.FeatureCollection): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let any = false;

  const walk = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const lng = coords[0] as number;
      const lat = coords[1] as number;
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
      any = true;
      return;
    }
    for (const c of coords) walk(c);
  };

  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === "Polygon" || g.type === "MultiPolygon") {
      walk(g.coordinates);
    }
  }

  if (!any || !Number.isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function normalizeDeptCode(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  if (/^\d+$/.test(s) && s.length === 1) return `0${s}`;
  return s;
}

/**
 * Carte des départements métropolitains + DOM : couleur par secteur (données `secteurs`).
 */
export function FranceSectorsMap({ secteurs }: { secteurs: SecteurMapRow[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<MapLibreModule["Map"]> | null>(null);
  const maplibreRef = useRef<MapLibreModule | null>(null);
  const [ready, setReady] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [hover, setHover] = useState<{ nom: string; dept: string; secteur: string | null } | null>(null);

  const deptToMeta = useMemo(() => {
    const m = new Map<string, { color: string; secteurNom: string }>();
    const palette = ["#EE4540", "#2563EB", "#16A34A", "#D97706", "#9333EA", "#0891B2", "#E11D48", "#4F46E5"];
    secteurs.forEach((s, i) => {
      const color =
        s.color_hex?.trim() && /^#[0-9A-Fa-f]{6}$/.test(s.color_hex.trim())
          ? s.color_hex.trim()
          : palette[i % palette.length];
      for (const d of s.departements || []) {
        const code = normalizeDeptCode(d);
        if (code) m.set(code, { color, secteurNom: s.nom });
      }
    });
    return m;
  }, [secteurs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await import("maplibre-gl/dist/maplibre-gl.css");
        const mod = await import("maplibre-gl");
        if (cancelled) return;
        maplibreRef.current = mod.default;
        setReady(true);
      } catch {
        if (!cancelled) setLoadErr("Chargement de la carte impossible.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const maplibregl = maplibreRef.current;
    if (!maplibregl) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [2.5, 46.6],
      zoom: 5.1,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    let cancelled = false;

    void (async () => {
      let geo: GeoJSON.FeatureCollection;
      try {
        const res = await fetch(GEOJSON_URL);
        if (!res.ok) throw new Error(String(res.status));
        geo = (await res.json()) as GeoJSON.FeatureCollection;
      } catch {
        if (!cancelled) setLoadErr("Impossible de charger le fond carte des départements (réseau).");
        return;
      }
      if (cancelled) return;

      const matchExpr: (string | string[])[] = ["match", ["to-string", ["coalesce", ["get", "code"], ""]]];
      const seen = new Set<string>();
      for (const f of geo.features) {
        const props = f.properties as Record<string, unknown> | null;
        const code = normalizeDeptCode(props?.code ?? props?.code_insee ?? props?.nom);
        if (!code || seen.has(code)) continue;
        seen.add(code);
        const meta = deptToMeta.get(code);
        matchExpr.push(code, meta?.color ?? FALLBACK_UNASSIGNED);
      }
      matchExpr.push(FALLBACK_UNASSIGNED);

      map.addSource("depts", { type: "geojson", data: geo });
      map.addLayer({
        id: "depts-fill",
        type: "fill",
        source: "depts",
        paint: {
          "fill-color": matchExpr as never,
          "fill-opacity": 0.82,
        },
      });
      map.addLayer({
        id: "depts-line",
        type: "line",
        source: "depts",
        paint: { "line-color": "#ffffff", "line-width": 0.35, "line-opacity": 0.9 },
      });

      const b = boundsFromFeatureCollection(geo);
      if (b) {
        map.fitBounds(b, {
          padding: { top: 28, bottom: 28, left: 28, right: 28 },
          duration: 0,
          maxZoom: 6.2,
        });
      }

      map.on("mousemove", "depts-fill", (e) => {
        const f = e.features?.[0];
        if (!f?.properties) {
          setHover(null);
          return;
        }
        const props = f.properties as Record<string, unknown>;
        const code = normalizeDeptCode(props.code ?? props.code_insee);
        const nom = String(props.nom ?? code ?? "");
        const meta = code ? deptToMeta.get(code) : undefined;
        setHover({ dept: code || "—", nom, secteur: meta?.secteurNom ?? null });
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "depts-fill", () => {
        setHover(null);
        map.getCanvas().style.cursor = "";
      });
    })();

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      cancelled = true;
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [ready, deptToMeta]);

  return (
    <Card className="border-border/60 shadow-soft overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Carte des secteurs</CardTitle>
        <CardDescription>
          Couleurs selon la gestion des secteurs ; départements non listés restent neutres. Survolez un département pour
          afficher son nom et le secteur associé.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadErr ? (
          <p className="text-sm text-destructive">{loadErr}</p>
        ) : (
          <>
            <div
              ref={containerRef}
              className="relative w-full min-h-[520px] h-[min(72vh,780px)] rounded-xl border border-border/60 overflow-hidden bg-muted/20"
            />
            {hover && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{hover.nom}</span> ({hover.dept})
                </span>
                {hover.secteur ? (
                  <span>
                    Secteur : <span className="font-medium text-foreground">{hover.secteur}</span>
                  </span>
                ) : (
                  <span>Non affecté à un secteur</span>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
              {secteurs.map((s) => {
                const c =
                  s.color_hex?.trim() && /^#[0-9A-Fa-f]{6}$/.test(s.color_hex.trim())
                    ? s.color_hex.trim()
                    : "#94a3b8";
                return (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <span className="h-3 w-3 rounded-sm border border-border shrink-0" style={{ backgroundColor: c }} />
                    <span className="text-foreground font-medium">{s.nom}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
