import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { fetchSuiviItemsConfig } from "@/data/suiviActiviteItems";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  suiviId: string;
}

export function SuiviActivitePdfDetail({ suiviId }: Props) {
  const handleExport = async () => {
    toast.info("Génération du PDF en cours…");

    try {
      const [{ data: suivi }, configItems] = await Promise.all([
        supabase.from("suivi_activite").select("*").eq("id", suiviId).single(),
        fetchSuiviItemsConfig(),
      ]);

      if (!suivi) {
        toast.error("Impossible de charger le suivi");
        return;
      }

      const items = (suivi.items as Record<string, { status: string; observation?: string }>) ?? {};

      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const checkPageBreak = (needed: number) => {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // ── Header ──
      doc.setFillColor(14, 34, 44);
      doc.rect(0, 0, pageW, 38, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport de suivi d'activité", margin, 16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${format(new Date(suivi.date), "dd MMMM yyyy", { locale: fr })}`, margin, 24);
      doc.text(`Généré le ${format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}`, margin, 31);
      y = 46;

      // ── Infos ──
      doc.setTextColor(14, 34, 44);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Informations générales", margin, y);
      y += 7;

      doc.setFontSize(9);
      const infoRows: [string, string][] = [
        ["Partenaire accompagné", suivi.agence || "—"],
        ["Partenaire référent", suivi.agence_referente || "—"],
        ["Suivi réalisé par", suivi.suivi_par || "—"],
        ["Date", format(new Date(suivi.date), "dd MMMM yyyy", { locale: fr })],
        ["Contrats total (année)", String(suivi.nb_contrats_total ?? 0)],
        ["Contrats depuis dernier", String(suivi.nb_contrats_depuis_dernier ?? 0)],
        ["Score global", `${suivi.total_items_valides ?? 0}/${suivi.total_items ?? 0} validés`],
      ];

      const rate = suivi.total_items ? Math.round(((suivi.total_items_valides ?? 0) / suivi.total_items) * 100) : 0;
      infoRows.push(["Taux de réussite", `${rate}%`]);

      infoRows.forEach(([label, value], idx) => {
        checkPageBreak(7);
        if (idx % 2 === 0) {
          doc.setFillColor(245, 247, 250);
          doc.rect(margin, y - 4, contentW, 7, "F");
        }
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 60, 60);
        doc.text(label, margin + 2, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(value, margin + 65, y);
        y += 7;
      });

      y += 6;

      // ── Items par catégorie ──
      let currentCat = "";
      configItems.forEach((item, idx) => {
        const answer = items[item.id];
        const status = answer?.status ?? null;
        const observation = answer?.observation ?? "";
        const isFait = status === "fait";
        const isPasFait = status === "pas_fait";
        const isNc = status === "nc";

        // Category header
        if (item.categorie !== currentCat) {
          currentCat = item.categorie;
          checkPageBreak(16);
          y += 4;
          doc.setFillColor(14, 34, 44);
          doc.rect(margin, y - 4, contentW, 8, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(currentCat.toUpperCase(), margin + 3, y + 1);
          y += 10;
        }

        const rowHeight = observation ? 13 : 7;
        checkPageBreak(rowHeight);

        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 252);
          doc.rect(margin, y - 4, contentW, rowHeight, "F");
        }

        // Color indicator
        if (isFait) doc.setFillColor(34, 197, 94);
        else if (isPasFait) doc.setFillColor(239, 68, 68);
        else if (isNc) doc.setFillColor(160, 160, 160);
        else doc.setFillColor(220, 220, 220);
        doc.rect(margin, y - 4, 2, rowHeight, "F");

        doc.setFontSize(8);

        // Number
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140, 140, 140);
        doc.text(`${item.numero}.`, margin + 4, y);

        // Title
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        const titleLines = doc.splitTextToSize(item.titre, contentW - 45);
        doc.text(titleLines[0], margin + 12, y);

        // Status
        doc.setFont("helvetica", "bold");
        if (isFait) {
          doc.setTextColor(34, 130, 60);
          doc.text("Fait ✓", contentW + margin - 3, y, { align: "right" });
        } else if (isPasFait) {
          doc.setTextColor(220, 60, 60);
          doc.text("Pas fait ✗", contentW + margin - 3, y, { align: "right" });
        } else if (isNc) {
          doc.setTextColor(130, 130, 130);
          doc.text("N/C", contentW + margin - 3, y, { align: "right" });
        } else {
          doc.setTextColor(180, 180, 180);
          doc.text("—", contentW + margin - 3, y, { align: "right" });
        }

        y += 6;

        // Observation
        if (observation) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(100, 100, 100);
          const obsLines = doc.splitTextToSize(`→ ${observation}`, contentW - 20);
          doc.text(obsLines.slice(0, 2).join("\n"), margin + 12, y);
          y += Math.min(obsLines.length, 2) * 4;
        }

        y += 1;
      });

      // ── Observations globales ──
      if (suivi.observations) {
        checkPageBreak(20);
        y += 6;
        doc.setFillColor(14, 34, 44);
        doc.rect(margin, y - 4, contentW, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("OBSERVATIONS", margin + 3, y + 1);
        y += 12;
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const obsLines = doc.splitTextToSize(suivi.observations, contentW - 4);
        doc.text(obsLines, margin + 2, y);
        y += obsLines.length * 4;
      }

      // ── Footer ──
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text("DynaPerf — Suivi d'activité", margin, pageH - 8);
      doc.text(`Page ${doc.getNumberOfPages()}`, pageW - margin, pageH - 8, { align: "right" });

      doc.save(`suivi_${suivi.agence.replace(/\s+/g, "_")}_${suivi.date}.pdf`);
      toast.success("PDF téléchargé !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5">
      <FontAwesomeIcon icon={faFilePdf} className="h-3.5 w-3.5" /> PDF détaillé
    </Button>
  );
}
