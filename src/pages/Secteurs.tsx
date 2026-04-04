import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type MapLibreModule = typeof import("maplibre-gl").default;

interface Club {
  id: string;
  nom: string;
  departement: string | null;
  statut: string;
  format: string;
  nb_membres_actifs: number;
  montant_ca: number;
  latitude: number | null;
  longitude: number | null;
  secteur_id: string | null;
  president_nom: string;
  adresse: string | null;
}

interface Partenaire {
  id: string;
  prenom: string;
  nom: string;
  societe: string;
  secteurs: string[];
  statut: string;
  genre: string | null;
  telephone: string;
  email: string;
}

interface Secteur {
  id: string;
  nom: string;
}

const SECTOR_COLORS = [
  "#EE4540", "#2563EB", "#16A34A", "#D97706", "#9333EA",
  "#0891B2", "#E11D48", "#4F46E5", "#059669", "#CA8A04",
];

const DEPT_COORDS: Record<string, [number, number]> = {
  "01": [46.2, 5.3], "02": [49.5, 3.6], "03": [46.3, 3.2], "04": [44.1, 6.2],
  "05": [44.7, 6.3], "06": [43.7, 7.1], "07": [44.7, 4.6], "08": [49.6, 4.6],
  "09": [42.9, 1.6], "10": [48.3, 4.1], "11": [43.2, 2.4], "12": [44.3, 2.6],
  "13": [43.5, 5.1], "14": [49.1, -0.4], "15": [45.0, 2.7], "16": [45.7, 0.2],
  "17": [45.9, -0.9], "18": [47.1, 2.4], "19": [45.3, 1.8], "21": [47.3, 4.9],
  "22": [48.5, -3.0], "23": [46.1, 2.0], "24": [45.2, 0.7], "25": [47.2, 6.0],
  "26": [44.7, 5.1], "27": [49.1, 1.2], "28": [48.4, 1.5], "29": [48.4, -4.3],
  "2A": [41.9, 8.9], "2B": [42.4, 9.2], "30": [44.0, 4.1], "31": [43.6, 1.4],
  "32": [43.7, 0.6], "33": [44.8, -0.6], "34": [43.6, 3.8], "35": [48.1, -1.7],
  "36": [46.8, 1.7], "37": [47.4, 0.7], "38": [45.2, 5.7], "39": [46.7, 5.7],
  "40": [43.9, -0.8], "41": [47.6, 1.3], "42": [45.7, 4.2], "43": [45.1, 3.7],
  "44": [47.2, -1.6], "45": [47.9, 1.9], "46": [44.6, 1.6], "47": [44.3, 0.6],
  "48": [44.5, 3.5], "49": [47.5, -0.5], "50": [48.9, -1.3], "51": [49.0, 3.9],
  "52": [48.1, 5.3], "53": [48.1, -0.8], "54": [48.7, 6.2], "55": [49.0, 5.4],
  "56": [47.7, -2.8], "57": [49.0, 6.6], "58": [47.0, 3.5], "59": [50.6, 3.1],
  "60": [49.4, 2.4], "61": [48.6, 0.1], "62": [50.5, 2.3], "63": [45.8, 3.1],
  "64": [43.3, -0.8], "65": [43.1, 0.1], "66": [42.7, 2.5], "67": [48.6, 7.5],
  "68": [47.9, 7.2], "69": [45.8, 4.8], "70": [47.6, 6.1], "71": [46.6, 4.4],
  "72": [48.0, 0.2], "73": [45.6, 6.4], "74": [46.0, 6.3], "75": [48.9, 2.3],
  "76": [49.6, 1.1], "77": [48.6, 2.9], "78": [48.8, 2.0], "79": [46.5, -0.3],
  "80": [49.9, 2.3], "81": [43.8, 2.1], "82": [44.0, 1.3], "83": [43.5, 6.2],
  "84": [44.0, 5.1], "85": [46.7, -1.4], "86": [46.6, 0.3], "87": [45.9, 1.3],
  "88": [48.2, 6.4], "89": [47.8, 3.6], "90": [47.6, 6.9], "91": [48.5, 2.2],
  "92": [48.8, 2.2], "93": [48.9, 2.5], "94": [48.8, 2.5], "95": [49.1, 2.2],
  "971": [16.2, -61.5], "972": [14.6, -61.0], "973": [3.9, -53.2],
  "974": [-21.1, 55.5], "976": [-12.8, 45.2],
};

function getClubCoords(club: Club): [number, number] | null {
  if (club.latitude && club.longitude) return [club.longitude, club.latitude];
  if (club.departement && DEPT_COORDS[club.departement]) {
    const [lat, lng] = DEPT_COORDS[club.departement];
    return [lng + (Math.random() - 0.5) * 0.3, lat + (Math.random() - 0.5) * 0.3];
  }
  return null;
}

function getPartenaireCoords(p: Partenaire, clubs: Club[], secteurs: Secteur[]): [number, number] | null {
  // Try to find a club in the same secteur
  const matchedSecteur = secteurs.find(s => p.secteurs.includes(s.nom));
  if (matchedSecteur) {
    const club = clubs.find(c => c.secteur_id === matchedSecteur.id);
    if (club) {
      const base = getClubCoords(club);
      if (base) return [base[0] + (Math.random() - 0.5) * 0.15, base[1] + (Math.random() - 0.5) * 0.15];
    }
  }
  // Fallback: random position near center of France
  return [2.5 + (Math.random() - 0.5) * 2, 46.6 + (Math.random() - 0.5) * 2];
}

function formatCA(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k€`;
  return `${n}€`;
}

export default function Secteurs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [partenaires, setPartenaires] = useState<Partenaire[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [selectedSecteur, setSelectedSecteur] = useState("all");
  const [selectedClub, setSelectedClub] = useState("all");
  const [showClubs, setShowClubs] = useState(true);
  const [showPartenaires, setShowPartenaires] = useState(false);
  const [loading, setLoading] = useState(true);
  const [maplibreReady, setMaplibreReady] = useState(false);
  const maplibreRef = useRef<MapLibreModule | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<MapLibreModule["Map"]> | null>(null);
  const markersRef = useRef<InstanceType<MapLibreModule["Marker"]>[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await import("maplibre-gl/dist/maplibre-gl.css");
      const mod = await import("maplibre-gl");
      if (cancelled) return;
      maplibreRef.current = mod.default;
      setMaplibreReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [clubsRes, secteursRes, partenairesRes] = await Promise.all([
      supabase.from("clubs").select("id, nom, departement, statut, format, nb_membres_actifs, montant_ca, latitude, longitude, secteur_id, president_nom, adresse").order("nom"),
      supabase.from("secteurs").select("*").order("nom"),
      supabase.from("partenaires").select("id, prenom, nom, societe, secteurs, statut, genre, telephone, email").eq("statut", "actif").order("nom"),
    ]);
    if (clubsRes.data) setClubs(clubsRes.data as any);
    if (secteursRes.data) setSecteurs(secteursRes.data as any);
    if (partenairesRes.data) setPartenaires(partenairesRes.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sectorColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    secteurs.forEach((s, i) => { map[s.id] = SECTOR_COLORS[i % SECTOR_COLORS.length]; });
    return map;
  }, [secteurs]);

  const filteredClubs = useMemo(() => {
    let result = clubs;
    if (selectedSecteur !== "all") {
      if (selectedSecteur === "__none") result = result.filter(c => !c.secteur_id);
      else result = result.filter(c => c.secteur_id === selectedSecteur);
    }
    if (selectedClub !== "all") result = result.filter(c => c.id === selectedClub);
    return result;
  }, [clubs, selectedSecteur, selectedClub]);

  const filteredPartenaires = useMemo(() => {
    if (selectedSecteur === "all") return partenaires;
    if (selectedSecteur === "__none") return partenaires.filter(p => p.secteurs.length === 0);
    const sName = secteurs.find(s => s.id === selectedSecteur)?.nom;
    return sName ? partenaires.filter(p => p.secteurs.includes(sName)) : partenaires;
  }, [partenaires, selectedSecteur, secteurs]);

  const clubsWithCoords = useMemo(() =>
    filteredClubs.map(c => ({ ...c, coords: getClubCoords(c) })).filter(c => c.coords !== null) as (Club & { coords: [number, number] })[],
  [filteredClubs]);

  const partenairesWithCoords = useMemo(() =>
    filteredPartenaires.map(p => ({ ...p, coords: getPartenaireCoords(p, clubs, secteurs) })).filter(p => p.coords !== null) as (Partenaire & { coords: [number, number] })[],
  [filteredPartenaires, clubs, secteurs]);

  // Initialize map (MapLibre chargé à la demande pour alléger le chunk route)
  useEffect(() => {
    if (!maplibreReady || loading || !mapContainerRef.current || mapRef.current) return;
    const maplibregl = maplibreRef.current;
    if (!maplibregl) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [2.5, 46.6],
      zoom: 5.2,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [maplibreReady, loading]);

  // Update markers
  useEffect(() => {
    const maplibregl = maplibreRef.current;
    const map = mapRef.current;
    if (!map || !maplibregl) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Club markers
    if (showClubs) {
      clubsWithCoords.forEach(c => {
        const color = c.secteur_id ? (sectorColorMap[c.secteur_id] || "#6B7280") : "#6B7280";
        const sectorName = secteurs.find(s => s.id === c.secteur_id)?.nom || "Sans secteur";

        const el = document.createElement("div");
        el.style.cssText = `width:28px;height:28px;border-radius:50%;border:3px solid white;background:${color};box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;`;
        const inner = document.createElement("div");
        inner.style.cssText = "width:8px;height:8px;background:white;border-radius:50%;";
        el.appendChild(inner);

        const popup = new maplibregl.Popup({ offset: 14, maxWidth: "240px" }).setHTML(`
          <div style="font-family:system-ui;font-size:13px;">
            <p style="font-weight:700;margin:0 0 4px;">🏢 ${c.nom}</p>
            <p style="color:#888;font-size:11px;margin:0 0 6px;">${sectorName}</p>
            <div style="border-top:1px solid #eee;padding-top:6px;font-size:11px;line-height:1.6;">
              <p style="margin:0;">👤 ${c.president_nom}</p>
              <p style="margin:0;">📍 Dpt. ${c.departement || "—"}</p>
              <p style="margin:0;">👥 ${c.nb_membres_actifs} membres</p>
              <p style="margin:0;">💰 ${formatCA(c.montant_ca)}</p>
              ${c.adresse ? `<p style="margin:0;">📌 ${c.adresse}</p>` : ""}
            </div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el }).setLngLat(c.coords).setPopup(popup).addTo(map);
        markersRef.current.push(marker);
      });
    }

    // Partenaire markers
    if (showPartenaires) {
      partenairesWithCoords.forEach(p => {
        const isF = p.genre === "F";
        const color = isF ? "#EC4899" : "#3B82F6";

        const el = document.createElement("div");
        el.style.cssText = `width:22px;height:22px;border-radius:4px;border:2px solid white;background:${color};box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:700;`;
        el.textContent = isF ? "♀" : "♂";

        const popup = new maplibregl.Popup({ offset: 12, maxWidth: "220px" }).setHTML(`
          <div style="font-family:system-ui;font-size:13px;">
            <p style="font-weight:700;margin:0 0 4px;">${isF ? "♀" : "♂"} ${p.prenom} ${p.nom}</p>
            <div style="border-top:1px solid #eee;padding-top:6px;font-size:11px;line-height:1.6;">
              <p style="margin:0;">🏢 ${p.societe}</p>
              <p style="margin:0;">📞 ${p.telephone}</p>
              <p style="margin:0;">✉️ ${p.email}</p>
              ${p.secteurs.length > 0 ? `<p style="margin:0;">📍 ${p.secteurs.join(", ")}</p>` : ""}
            </div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el }).setLngLat(p.coords).setPopup(popup).addTo(map);
        markersRef.current.push(marker);
      });
    }

    // Fit bounds
    const allCoords: [number, number][] = [
      ...(showClubs ? clubsWithCoords.map(c => c.coords) : []),
      ...(showPartenaires ? partenairesWithCoords.map(p => p.coords) : []),
    ];
    if (allCoords.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      allCoords.forEach(c => bounds.extend(c));
      if (allCoords.length === 1) {
        map.flyTo({ center: allCoords[0], zoom: 10, duration: 800 });
      } else {
        map.fitBounds(bounds, { padding: 60, duration: 800 });
      }
    }
  }, [maplibreReady, clubsWithCoords, partenairesWithCoords, sectorColorMap, secteurs, showClubs, showPartenaires]);

  const totalDisplayed = (showClubs ? clubsWithCoords.length : 0) + (showPartenaires ? partenairesWithCoords.length : 0);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="bg-card rounded-2xl shadow-soft border border-border/60 p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Carte du réseau</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="w-full sm:w-auto">
              <label className="text-xs text-muted-foreground mb-1 block">Secteur</label>
              <Select value={selectedSecteur} onValueChange={v => { setSelectedSecteur(v); setSelectedClub("all"); }}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les secteurs</SelectItem>
                  {secteurs.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sectorColorMap[s.id] }} />
                        {s.nom}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value="__none">Sans secteur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <label className="text-xs text-muted-foreground mb-1 block">Club</label>
              <Select value={selectedClub} onValueChange={setSelectedClub}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clubs</SelectItem>
                  {(selectedSecteur !== "all" ? clubs.filter(c => selectedSecteur === "__none" ? !c.secteur_id : c.secteur_id === selectedSecteur) : clubs).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2">
                <Switch id="show-clubs" checked={showClubs} onCheckedChange={setShowClubs} />
                <Label htmlFor="show-clubs" className="text-xs">Clubs</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-partenaires" checked={showPartenaires} onCheckedChange={setShowPartenaires} />
                <Label htmlFor="show-partenaires" className="text-xs">Partenaires</Label>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-3">
            {secteurs.map(s => (
              <div key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: sectorColorMap[s.id] }} />
                {s.nom}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-full shrink-0 bg-muted-foreground" />
              Sans secteur
            </div>
            {showPartenaires && (
              <>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded shrink-0" style={{ background: "#3B82F6" }} />
                  ♂ Homme
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-3 h-3 rounded shrink-0" style={{ background: "#EC4899" }} />
                  ♀ Femme
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{totalDisplayed} élément{totalDisplayed > 1 ? "s" : ""} affiché{totalDisplayed > 1 ? "s" : ""}</span>
            {showClubs && <Badge variant="secondary" className="text-[10px] h-5">🏢 {clubsWithCoords.length} clubs</Badge>}
            {showPartenaires && <Badge variant="secondary" className="text-[10px] h-5">👤 {partenairesWithCoords.length} partenaires</Badge>}
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-soft border border-border/60 overflow-hidden" style={{ height: "calc(100vh - 320px)", minHeight: 400 }}>
          {loading || !maplibreReady ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {loading ? "Chargement des données…" : "Chargement de la carte…"}
            </div>
          ) : (
            <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
