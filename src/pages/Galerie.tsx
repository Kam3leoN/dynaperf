import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { PhotoLightbox, LightboxImage } from "@/components/PhotoLightbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImages } from "@fortawesome/free-solid-svg-icons";

interface PhotoEntry {
  url: string;
  path: string;
  auditId: string;
  partenaire: string;
  date: string;
  typeEvenement: string;
  lieu: string | null;
}

const TYPE_FILTERS = ["Tous", "Club Affaires", "RD Présentiel", "RD Distanciel", "RDV Commercial", "Mise en Place", "RD Événementiel"];

export default function Galerie() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Tous");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    const { data } = await supabase
      .from("audit_details")
      .select("photos, audit_id, audits!inner(partenaire, date, type_evenement, lieu, statut)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data) { setLoading(false); return; }

    const entries = data.filter(d => {
      const a = d.audits as unknown as { partenaire: string; date: string; type_evenement: string; lieu: string | null; statut: string };
      return d.photos && (d.photos as string[]).length > 0 && a.statut === 'OK';
    });

    const allPaths = entries.flatMap(d => (d.photos as string[]));
    if (allPaths.length === 0) { setPhotos([]); setLoading(false); return; }

    const { data: signed } = await supabase.storage
      .from("audit-photos")
      .createSignedUrls(allPaths, 3600);

    const urlMap = new Map<string, string>();
    signed?.forEach(s => { if (s.signedUrl) urlMap.set(s.path, s.signedUrl); });

    const result: PhotoEntry[] = [];
    for (const entry of entries) {
      const a = entry.audits as unknown as { partenaire: string; date: string; type_evenement: string; lieu: string | null };
      for (const path of (entry.photos as string[])) {
        const url = urlMap.get(path);
        if (url) {
          result.push({
            url,
            path,
            auditId: entry.audit_id,
            partenaire: a.partenaire,
            date: a.date,
            typeEvenement: a.type_evenement,
            lieu: a.lieu,
          });
        }
      }
    }
    setPhotos(result);
    setLoading(false);
  };

  const filtered = filter === "Tous" ? photos : photos.filter(p => p.typeEvenement === filter);

  const lightboxImages: LightboxImage[] = filtered.map(p => ({
    url: p.url,
    label: `${p.partenaire} — ${p.typeEvenement}${p.lieu ? ` — ${p.lieu}` : ''}`,
    date: format(new Date(p.date), "dd MMMM yyyy", { locale: fr }),
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faImages} className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Galerie photos</h1>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {filtered.length} photo{filtered.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground animate-pulse">Chargement des photos…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <FontAwesomeIcon icon={faImages} className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Aucune photo trouvée</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {filtered.map((photo, idx) => (
              <div
                key={`${photo.path}-${idx}`}
                className="break-inside-avoid cursor-pointer group relative overflow-hidden rounded-xl border border-border"
                onClick={() => setLightboxIndex(idx)}
              >
                <img
                  src={photo.url}
                  alt={`${photo.partenaire} — ${photo.typeEvenement}`}
                  className="w-full object-cover transition-transform duration-m3-standard ease-m3-standard group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate">{photo.partenaire}</p>
                  <p className="text-white/70 text-[10px]">
                    {format(new Date(photo.date), "dd MMM yyyy", { locale: fr })} • {photo.typeEvenement}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {lightboxIndex !== null && (
          <PhotoLightbox
            images={lightboxImages}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}
