import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SuiviRow {
  id: string;
  date: string;
  agence: string;
  suivi_par: string;
  total_items_valides: number;
  total_items: number;
  nb_contrats_total?: number;
  nb_contrats_depuis_dernier?: number;
}

interface SuiviActiviteExportProps {
  suivis: SuiviRow[];
}

export function SuiviActiviteExportExcel({ suivis }: SuiviActiviteExportProps) {
  const handleExport = () => {
    const rows = suivis.map((s) => ({
      Date: format(new Date(s.date), "dd/MM/yyyy"),
      Agence: s.agence,
      "Suivi par": s.suivi_par,
      "Items validés": s.total_items_valides ?? 0,
      "Items total": s.total_items ?? 0,
      "Taux (%)": s.total_items
        ? Math.round(((s.total_items_valides ?? 0) / s.total_items) * 100)
        : 0,
      "Contrats total": s.nb_contrats_total ?? 0,
      "Contrats depuis dernier": s.nb_contrats_depuis_dernier ?? 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suivis Activité");

    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key]).length)) + 2,
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `suivis_activite_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5">
      <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" /> Excel
    </Button>
  );
}

export function SuiviActiviteExportPDF({ suivis }: SuiviActiviteExportProps) {
  const handleExport = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Suivis d'activité — Export", 14, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Généré le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, 14, 24);

    // Table headers
    const headers = ["Date", "Agence", "Suivi par", "Validés", "Total", "Taux", "Contrats"];
    const colX = [14, 42, 90, 148, 170, 192, 218];
    let y = 34;

    doc.setFillColor(14, 34, 44);
    doc.rect(12, y - 5, pageW - 24, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => doc.text(h, colX[i], y));
    y += 8;

    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    suivis.forEach((s, idx) => {
      if (y > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(245, 247, 250);
        doc.rect(12, y - 4, pageW - 24, 7, "F");
      }

      const rate = s.total_items
        ? `${Math.round(((s.total_items_valides ?? 0) / s.total_items) * 100)}%`
        : "—";

      const row = [
        format(new Date(s.date), "dd/MM/yyyy"),
        s.agence,
        s.suivi_par,
        String(s.total_items_valides ?? 0),
        String(s.total_items ?? 0),
        rate,
        String(s.nb_contrats_total ?? 0),
      ];
      row.forEach((val, i) => doc.text(val, colX[i], y));
      y += 7;
    });

    doc.save(`suivis_activite_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5">
      <FontAwesomeIcon icon={faFilePdf} className="h-3.5 w-3.5" /> PDF
    </Button>
  );
}
