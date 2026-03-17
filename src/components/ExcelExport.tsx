import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";

interface Audit {
  date: string;
  partenaire: string;
  lieu: string;
  auditeur: string;
  typeEvenement: string;
  note: number | null;
  moisVersement: string;
  statut: "OK" | "NON";
}

interface ExcelExportProps {
  audits: Audit[];
}

export function ExcelExport({ audits }: ExcelExportProps) {
  const handleExport = () => {
    const rows = audits.map((a) => ({
      Date: a.date,
      Partenaire: a.partenaire,
      Lieu: a.lieu,
      Auditeur: a.auditeur,
      "Type d'événement": a.typeEvenement,
      Note: a.note ?? "",
      "Mois de versement": a.moisVersement,
      Statut: a.statut === "OK" ? "Noté" : "En attente",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audits");

    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key]).length)) + 2,
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `audits_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5 rounded-md">
      <FontAwesomeIcon icon={faDownload} className="h-4 w-4" /> Exporter Excel
    </Button>
  );
}
