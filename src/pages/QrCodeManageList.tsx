import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { QrSavedCardPreview } from "@/components/qr/QrSavedCardPreview";
import { mergeQrStyle } from "@/lib/qrCodeStyle";
import { coerceExportSize, encodedPayloadForRecord, logoUrlForExport } from "@/lib/qrRecordHelpers";
import { buildQrShapeInnerFragments } from "@/lib/qrShapeMarkup";
import { renderQrSvgString } from "@/lib/qrSvgRender";
import { useQrShapeLibraryMap } from "@/hooks/useQrShapeLibrary";
import { sanitizeExportBasename, triggerFileDownload } from "@/lib/qrExportDownload";
import type { QrRecord } from "@/types/qrCodeRecord";

/**
 * Liste des QR enregistrés — seule vue de la route `/qrcodes` (« Gérer les QrCode »).
 * L’édition ouvre `/qrcodes/new?edit=:id`.
 */
export default function QrCodeManageList() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [records, setRecords] = useState<QrRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const sorted = useMemo(() => [...records].sort((a, b) => a.name.localeCompare(b.name, "fr")), [records]);
  const { byId: shapeById } = useQrShapeLibraryMap();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("qr_codes").select("*").order("created_at", { ascending: false });
      if (error) {
        toast.error(`QR codes: ${error.message}`);
        if (alive) setLoading(false);
        return;
      }
      if (!alive) return;
      setRecords(
        (data ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          value: r.value,
          size: coerceExportSize(r.size),
          fgColor: r.fg_color,
          bgColor: r.bg_color,
          level: (r.level as QrRecord["level"]) || "M",
          logoUrl: r.logo_url ?? "",
          qrStyle: mergeQrStyle(r.qr_style),
          scanCount: typeof r.scan_count === "number" ? r.scan_count : 0,
        })),
      );
      setLoading(false);
    };
    void load();
    return () => {
      alive = false;
    };
  }, [authLoading, user]);

  const persistDelete = async (id: string) => {
    const { error } = await supabase.from("qr_codes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRecords((prev) => prev.filter((x) => x.id !== id));
  };

  const downloadSavedQr = async (record: QrRecord) => {
    if (shapeById.size === 0) {
      toast.error("Bibliothèque de formes indisponible — réessayez dans un instant.");
      return;
    }
    const payload = encodedPayloadForRecord(record).trim();
    if (!payload) {
      toast.error("Contenu du QR vide — ouvrez l’édition pour corriger.");
      return;
    }
    const size = coerceExportSize(record.size);
    try {
      const fr = buildQrShapeInnerFragments(record.qrStyle, shapeById);
      const svg = renderQrSvgString({
        value: payload,
        size,
        fgColor: record.fgColor,
        bgColor: record.bgColor,
        level: record.level,
        style: record.qrStyle,
        logoUrl: logoUrlForExport(record),
        shapeInnerFragments: fr,
      });
      const base = sanitizeExportBasename(record.name || "qrcode");
      triggerFileDownload(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${base}.svg`);
      toast.success("SVG téléchargé.");
    } catch {
      toast.error("Export impossible (vérifiez le logo et les formes).");
    }
  };

  const openEdit = (r: QrRecord) => {
    navigate(`/qrcodes/new?edit=${encodeURIComponent(r.id)}`);
  };

  return (
    <AppLayout>
      <section className="app-page-shell-wide min-w-0 w-full space-y-6 pb-10">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">QR codes enregistrés</CardTitle>
            <CardDescription>{loading ? "Chargement…" : `${sorted.length} élément(s)`}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun QR code pour le moment.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sorted.map((r) => (
                  <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">{r.scanCount ?? 0} scan(s)</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Télécharger"
                          onClick={() => void downloadSavedQr(r)}
                        >
                          <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}>
                          <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => void persistDelete(r.id)}
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <QrSavedCardPreview record={r} shapeById={shapeById} />
                    </div>
                    <p className="line-clamp-2 break-all text-[11px] text-muted-foreground">{r.value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}
