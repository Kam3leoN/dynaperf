import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchAuditConfig, AuditTypeConfig } from "@/data/auditItems";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { AuditPdfExport } from "@/components/AuditPdfExport";

interface AuditDetailViewProps {
  auditId: string;
  typeEvenement: string;
  open: boolean;
  onClose: () => void;
  partenaire?: string;
  date?: string;
  lieu?: string | null;
  auditeur?: string;
  note?: number | null;
}

interface DetailData {
  items: Record<string, { score: number; comment?: string; checklist?: boolean[]; rawValue?: number }>;
  total_points: number | null;
  note_sur_10: number | null;
  partenaire_referent: string | null;
  type_lieu: string | null;
  heure_evenement: string | null;
  nom_club: string | null;
  nb_adherents: number | null;
  nb_invites: number | null;
  nb_no_show: number | null;
  nb_participants: number | null;
  nb_rdv_pris: number | null;
}

export function AuditDetailView({ auditId, typeEvenement, open, onClose, partenaire, date, lieu, auditeur, note }: AuditDetailViewProps) {
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [config, setConfig] = useState<AuditTypeConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    Promise.all([
      supabase.from("audit_details").select("*").eq("audit_id", auditId).single(),
      fetchAuditConfig(typeEvenement),
    ]).then(([{ data: detailRow }, cfg]) => {
      if (detailRow) {
        setDetail({
          ...detailRow,
          items: (detailRow.items as any) ?? {},
        });
      }
      setConfig(cfg);
      setLoading(false);
    });
  }, [open, auditId, typeEvenement]);

  const allItems = config?.categories.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, categoryName: cat.name }))
  ) ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <DialogTitle>Détail de l'audit</DialogTitle>
            <AuditPdfExport
              auditId={auditId}
              partenaire={partenaire ?? ""}
              typeEvenement={typeEvenement}
              date={date ?? ""}
              lieu={lieu}
              auditeur={auditeur ?? ""}
              note={note}
            />
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground animate-pulse py-8 text-center text-sm">
            Chargement…
          </p>
        ) : !detail ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Aucun détail trouvé pour cet audit.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary" className="text-xs">
                Total : {detail.total_points ?? "—"} pts
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Note : {detail.note_sur_10 ?? "—"}/10
              </Badge>
              {detail.nb_participants != null && (
                <Badge variant="outline" className="text-xs">
                  {detail.nb_participants} participants
                </Badge>
              )}
              {detail.nb_invites != null && (
                <Badge variant="outline" className="text-xs">
                  {detail.nb_invites} invités
                </Badge>
              )}
            </div>

            {/* Items table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-10">#</TableHead>
                    <TableHead className="text-xs">Catégorie</TableHead>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs text-center w-24">Score</TableHead>
                    <TableHead className="text-xs w-20">Statut</TableHead>
                    <TableHead className="text-xs">Commentaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allItems.map((item, idx) => {
                    const answer = detail.items[item.id];
                    const score = answer?.score ?? 0;
                    const isMax = score === item.maxPoints;
                    const hasScore = score > 0;

                    return (
                      <TableRow key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {item.categoryName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {item.title}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{
                              color: isMax
                                ? "hsl(var(--chart-2))"
                                : hasScore
                                ? "hsl(var(--chart-4))"
                                : "hsl(var(--muted-foreground))",
                            }}
                          >
                            {score}/{item.maxPoints}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isMax ? (
                            <FontAwesomeIcon
                              icon={faCheck}
                              className="h-4 w-4"
                              style={{ color: "hsl(var(--chart-2))" }}
                            />
                          ) : (
                            <FontAwesomeIcon
                              icon={faXmark}
                              className="h-4 w-4 text-destructive"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {answer?.comment || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
