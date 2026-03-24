import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { fetchAuditConfig } from "@/data/auditItems";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface AuditPdfExportProps {
  auditId: string;
  partenaire: string;
  typeEvenement: string;
  date: string;
  lieu?: string | null;
  auditeur: string;
  note?: number | null;
}

export function AuditPdfExport({ auditId, partenaire, typeEvenement, date, lieu, auditeur, note }: AuditPdfExportProps) {
  const handleExport = async () => {
    toast.info("Génération du PDF en cours…");

    try {
      const [{ data: detail }, config] = await Promise.all([
        supabase.from("audit_details").select("*").eq("audit_id", auditId).single(),
        fetchAuditConfig(typeEvenement),
      ]);

      if (!detail || !config) {
        toast.error("Impossible de charger les détails de l'audit");
        return;
      }

      const items = (detail.items as Record<string, { score: number; comment?: string; checklist?: boolean[]; rawValue?: number }>) ?? {};
      const allItems = config.categories.flatMap((cat) =>
        cat.items.map((item) => ({ ...item, categoryName: cat.name }))
      );

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
      doc.text("Rapport d'audit", margin, 16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`${typeEvenement} — ${format(new Date(date), "dd MMMM yyyy", { locale: fr })}`, margin, 24);
      doc.text(`Généré le ${format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr })}`, margin, 31);
      y = 46;

      // ── Infos générales ──
      doc.setTextColor(14, 34, 44);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Informations générales", margin, y);
      y += 7;

      doc.setFontSize(9);
      const infoRows: [string, string][] = [
        ["Partenaire audité", partenaire],
        ["Partenaire référent", detail.partenaire_referent || "—"],
        ["Auditeur", auditeur],
        ["Ville", lieu || "—"],
        ["Lieu", detail.type_lieu || "—"],
        ["Qualité du lieu", detail.qualite_lieu != null ? "★".repeat(detail.qualite_lieu) + "☆".repeat(5 - detail.qualite_lieu) : "—"],
        ["Heure", detail.heure_evenement || "—"],
        ["Note globale", `${detail.note_sur_10 ?? note ?? "—"}/10 (${detail.total_points ?? "—"} pts)`],
      ];

      if (detail.nom_club) infoRows.push(["Club", detail.nom_club]);
      if (detail.nb_adherents != null) infoRows.push(["Adhérents", String(detail.nb_adherents)]);
      if (detail.nb_invites != null) infoRows.push(["Invités", String(detail.nb_invites)]);
      if (detail.nb_no_show != null) infoRows.push(["No-show", String(detail.nb_no_show)]);
      if (detail.nb_participants != null) infoRows.push(["Participants", String(detail.nb_participants)]);
      if (detail.nb_rdv_pris != null) infoRows.push(["RDV pris", String(detail.nb_rdv_pris)]);

      // Ratios
      if (detail.nb_invites && detail.nb_participants && detail.nb_participants > 0) {
        infoRows.push(["Ratio invités/participants", `${((detail.nb_invites / detail.nb_participants) * 100).toFixed(1)}%`]);
      }
      if (detail.nb_rdv_pris != null && detail.nb_invites && detail.nb_invites > 0) {
        infoRows.push(["Ratio RDV/invités", `${((detail.nb_rdv_pris / detail.nb_invites) * 100).toFixed(1)}%`]);
      }

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
      let itemGlobalIdx = 0;
      allItems.forEach((item) => {
        itemGlobalIdx++;
        const answer = items[item.id];
        const score = answer?.score ?? 0;
        const isMax = score === item.maxPoints;
        const hasComment = !!answer?.comment;
        const hasChecklist = item.inputType === "checklist" && item.checklistItems && answer?.checklist;
        const hasDescription = !!(item.description || item.condition);
        const hasScoringRules = !!item.scoringRules;
        const hasRawValue = item.inputType === "number" && answer?.rawValue !== undefined;

        // Category header
        if (item.categoryName !== currentCat) {
          currentCat = item.categoryName;
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

        // Item title + score
        checkPageBreak(12);

        // Color indicator
        if (isMax) doc.setFillColor(34, 197, 94);
        else if (score > 0) doc.setFillColor(245, 158, 11);
        else doc.setFillColor(220, 220, 220);
        doc.rect(margin, y - 4, 2, 7, "F");

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140, 140, 140);
        doc.text(`${itemGlobalIdx}.`, margin + 4, y);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        const titleLines = doc.splitTextToSize(item.title, contentW - 50);
        doc.text(titleLines[0], margin + 12, y);

        // Score
        doc.setFont("helvetica", "bold");
        doc.setTextColor(isMax ? 34 : score > 0 ? 180 : 140, isMax ? 130 : score > 0 ? 120 : 140, isMax ? 60 : score > 0 ? 20 : 140);
        doc.text(`${score}/${item.maxPoints}`, contentW + margin - 3, y, { align: "right" });

        // Status
        doc.setFontSize(7);
        doc.text(isMax ? "✓" : score > 0 ? "~" : "✗", contentW + margin - 16, y);
        y += 6;

        // Description & condition
        if (hasDescription) {
          const descParts: string[] = [];
          if (item.description) descParts.push(item.description);
          if (item.condition) descParts.push(`Condition : ${item.condition}`);
          const descText = descParts.join(" | ");
          const descLines = doc.splitTextToSize(descText, contentW - 20);
          const linesToShow = descLines.slice(0, 3);
          checkPageBreak(linesToShow.length * 3.5 + 2);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(120, 120, 120);
          doc.text(linesToShow.join("\n"), margin + 12, y);
          y += linesToShow.length * 3.5;
        }

        // Scoring rules
        if (hasScoringRules) {
          const ruleLines = doc.splitTextToSize(`Barème : ${item.scoringRules}`, contentW - 20);
          const rl = ruleLines.slice(0, 2);
          checkPageBreak(rl.length * 3.5 + 2);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(100, 100, 160);
          doc.text(rl.join("\n"), margin + 12, y);
          y += rl.length * 3.5;
        }

        // Raw value
        if (hasRawValue) {
          checkPageBreak(5);
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80, 80, 80);
          doc.text(`Valeur saisie : ${answer!.rawValue}`, margin + 12, y);
          y += 4;
        }

        // Checklist
        if (hasChecklist && item.checklistItems) {
          item.checklistItems.forEach((label, ci) => {
            const checked = answer!.checklist![ci] ?? false;
            checkPageBreak(5);
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(checked ? 34 : 180, checked ? 130 : 60, checked ? 60 : 60);
            doc.text(`${checked ? "☑" : "☐"} ${label}`, margin + 14, y);
            y += 3.5;
          });
          y += 1;
        }

        // Comment
        if (hasComment) {
          checkPageBreak(6);
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(100, 100, 100);
          const commentLines = doc.splitTextToSize(`→ ${answer!.comment}`, contentW - 20);
          doc.text(commentLines.slice(0, 2).join("\n"), margin + 12, y);
          y += Math.min(commentLines.length, 2) * 4;
        }

        y += 2;
      });

      // ── Photos ──
      const photoUrls = (detail.photos as string[]) ?? [];
      if (photoUrls.length > 0) {
        checkPageBreak(20);
        y += 6;
        doc.setFillColor(14, 34, 44);
        doc.rect(margin, y - 4, contentW, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`PHOTOS (${photoUrls.length})`, margin + 3, y + 1);
        y += 12;

        for (const url of photoUrls) {
          try {
            const img = await loadImage(url);
            const imgW = Math.min(contentW, 120);
            const ratio = img.height / img.width;
            const imgH = imgW * ratio;
            checkPageBreak(imgH + 6);
            doc.addImage(img, "JPEG", margin, y, imgW, imgH);
            y += imgH + 6;
          } catch {
            checkPageBreak(8);
            doc.setTextColor(180, 60, 60);
            doc.setFontSize(7);
            doc.text("⚠ Image non chargée", margin, y);
            y += 6;
          }
        }
      }

      // ── Footer on all pages ──
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text("DynaPerf — Rapport d'audit", margin, pageH - 8);
        doc.text(`Page ${i}/${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
      }

      doc.save(`audit_${partenaire.replace(/\s+/g, "_")}_${date}.pdf`);
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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
