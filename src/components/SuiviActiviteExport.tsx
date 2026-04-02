import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { openPrintWindow, escapeHtml, formatNow } from "@/lib/printPdf";

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
    const headers = ["Date", "Agence", "Suivi par", "Validés", "Total", "Taux", "Contrats"];

    let html = "";

    html += `<div class="report-header">
      <h1>Suivis d'activité — Export</h1>
      <div class="subtitle">Généré le ${formatNow()}</div>
      <div class="subtitle">${suivis.length} suivi${suivis.length > 1 ? "s" : ""}</div>
    </div>`;

    html += `<table style="width:100%;border-collapse:collapse;font-size:9px;margin-top:12px;">`;
    html += `<thead><tr style="background:#0E222C;color:white;">`;
    for (const h of headers) {
      html += `<th style="padding:6px 8px;text-align:left;font-weight:600;font-size:9px;">${h}</th>`;
    }
    html += `</tr></thead><tbody>`;

    suivis.forEach((s, idx) => {
      const rate = s.total_items
        ? `${Math.round(((s.total_items_valides ?? 0) / s.total_items) * 100)}%`
        : "—";
      const bg = idx % 2 === 0 ? "#f8fafc" : "white";
      const rateNum = s.total_items ? Math.round(((s.total_items_valides ?? 0) / s.total_items) * 100) : 0;
      const rateColor = rateNum >= 75 ? "#166534" : rateNum >= 50 ? "#92400e" : "#991b1b";

      html += `<tr style="background:${bg};">`;
      html += `<td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">${format(new Date(s.date), "dd/MM/yyyy")}</td>`;
      html += `<td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-weight:500;">${escapeHtml(s.agence)}</td>`;
      html += `<td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(s.suivi_par)}</td>`;
      html += `<td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-variant-numeric:tabular-nums;">${s.total_items_valides ?? 0}</td>`;
      html += `<td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-variant-numeric:tabular-nums;">${s.total_items ?? 0}</td>`;
      html += `<td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-weight:600;color:${rateColor};">${rate}</td>`;
      html += `<td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-variant-numeric:tabular-nums;">${s.nb_contrats_total ?? 0}</td>`;
      html += `</tr>`;
    });

    html += `</tbody></table>`;

    html += `<div class="report-footer">
      <span>DynaPerf — Suivis d'activité</span>
      <span>${formatNow()}</span>
    </div>`;

    openPrintWindow("Suivis d'activité — Export", html);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5">
      <FontAwesomeIcon icon={faFilePdf} className="h-3.5 w-3.5" /> PDF
    </Button>
  );
}
