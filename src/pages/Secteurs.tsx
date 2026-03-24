import { useState, useEffect, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

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

interface Secteur {
  id: string;
  nom: string;
}

// Color palette for sectors
const SECTOR_COLORS = [
  "#EE4540", "#2563EB", "#16A34A", "#D97706", "#9333EA",
  "#0891B2", "#E11D48", "#4F46E5", "#059669", "#CA8A04",
];

function createColorIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background:${color};
      width:28px;height:28px;border-radius:50%;border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    "><div style="width:8px;height:8px;background:white;border-radius:50%;"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// France departement approximate coordinates (for clubs without lat/lng)
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
  if (club.latitude && club.longitude) return [club.latitude, club.longitude];
  if (club.departement && DEPT_COORDS[club.departement]) {
    const [lat, lng] = DEPT_COORDS[club.departement];
    // Add small random offset to avoid stacking
    return [lat + (Math.random() - 0.5) * 0.3, lng + (Math.random() - 0.5) * 0.3];
  }
  return null;
}

export default function Secteurs() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [secteurs, setSecteurs] = useState<Secteur[]>([]);
  const [selectedSecteur, setSelectedSecteur] = useState("all");
  const [selectedClub, setSelectedClub] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [clubsRes, secteursRes] = await Promise.all([
      supabase.from("clubs").select("id, nom, departement, statut, format, nb_membres_actifs, montant_ca, latitude, longitude, secteur_id, president_nom, adresse").order("nom"),
      supabase.from("secteurs").select("*").order("nom"),
    ]);
    if (clubsRes.data) setClubs(clubsRes.data as any);
    if (secteursRes.data) setSecteurs(secteursRes.data as any);
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
      result = result.filter(c => c.secteur_id === selectedSecteur);
    }
    if (selectedClub !== "all") {
      result = result.filter(c => c.id === selectedClub);
    }
    return result;
  }, [clubs, selectedSecteur, selectedClub]);

  const clubsWithCoords = useMemo(() =>
    filteredClubs.map(c => ({ ...c, coords: getClubCoords(c) })).filter(c => c.coords !== null),
  [filteredClubs]);

  const formatCA = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k€`;
    return `${n}€`;
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="bg-card rounded-lg shadow-soft p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Carte des clubs d'affaires</h2>
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
          </div>

          <div className="text-xs text-muted-foreground mb-2">
            {clubsWithCoords.length} club{clubsWithCoords.length > 1 ? "s" : ""} affiché{clubsWithCoords.length > 1 ? "s" : ""}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Chargement de la carte…</div>
          ) : (
            <MapContainer center={[46.6, 2.5]} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {clubsWithCoords.map(c => {
                const color = c.secteur_id ? (sectorColorMap[c.secteur_id] || "#6B7280") : "#6B7280";
                return (
                  <Marker key={c.id} position={c.coords as [number, number]} icon={createColorIcon(color)}>
                    <Popup>
                      <div className="text-sm space-y-1 min-w-[180px]">
                        <p className="font-bold text-foreground">{c.nom}</p>
                        <p className="text-muted-foreground text-xs">
                          {secteurs.find(s => s.id === c.secteur_id)?.nom || "Sans secteur"}
                        </p>
                        <div className="border-t pt-1 mt-1 space-y-0.5 text-xs">
                          <p>👤 {c.president_nom}</p>
                          <p>📍 Dpt. {c.departement || "—"}</p>
                          <p>👥 {c.nb_membres_actifs} membres</p>
                          <p>💰 {formatCA(c.montant_ca)}</p>
                          {c.adresse && <p>📌 {c.adresse}</p>}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
