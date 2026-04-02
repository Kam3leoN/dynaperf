import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { fetchSuiviItemsConfig } from "@/data/suiviActiviteItems";
import { toast } from "sonner";
import {
  openPrintWindow,
  escapeHtml,
  formatDateFr,
  formatNow,
  infoFieldHtml,
} from "@/lib/printPdf";

interface Props {
  suiviId: string;
}

export function SuiviActivitePdfDetail({ suiviId }: Props) {
  const handleExport = async () => {
    toast.info("Préparation du rapport…");

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
      const rate = suivi.total_items ? Math.round(((suivi.total_items_valides ?? 0) / suivi.total_items) * 100) : 0;

      let html = "";

      // ── Header ──
      html += `<div class="report-header">
        <h1>Rapport de suivi d'activité</h1>
        <div class="subtitle">${formatDateFr(suivi.date)}</div>
        <div class="subtitle">Généré le ${formatNow()}</div>
      </div>`;

      // ── Informations générales ──
      html += `<div class="section-title">Informations générales</div>`;
      html += `<div class="info-grid">`;
      html += infoFieldHtml("Partenaire accompagné", suivi.agence);
      html += infoFieldHtml("Partenaire référent", suivi.agence_referente);
      html += infoFieldHtml("Suivi réalisé par", suivi.suivi_par);
      html += infoFieldHtml("Date", formatDateFr(suivi.date));
      html += infoFieldHtml("Contrats total (année)", String(suivi.nb_contrats_total ?? 0));
      html += infoFieldHtml("Contrats depuis dernier", String(suivi.nb_contrats_depuis_dernier ?? 0));
      html += infoFieldHtml("Score global", `${suivi.total_items_valides ?? 0}/${suivi.total_items ?? 0} validés`);
      html += infoFieldHtml("Taux de réussite", `${rate}%`);
      html += `</div>`;

      // ── Score badge ──
      const rateClass = rate >= 75 ? "badge-emerald" : rate >= 50 ? "badge-amber" : "badge-red";
      html += `<div style="margin-top:10px;display:flex;gap:6px;">`;
      html += `<span class="badge ${rateClass}" style="font-size:11px;padding:4px 12px;">${rate}% de réussite</span>`;
      html += `</div>`;

      // ── Items par catégorie ──
      let currentCat = "";
      for (const item of configItems) {
        const answer = items[item.id];
        const status = answer?.status ?? null;
        const observation = answer?.observation ?? "";
        const isFait = status === "fait";
        const isPasFait = status === "pas_fait";
        const isNc = status === "nc";

        // Category header
        if (item.categorie !== currentCat) {
          currentCat = item.categorie;
          html += `<div class="cat-header">${escapeHtml(currentCat)}</div>`;
        }

        const borderClass = isFait ? "border-emerald" : isPasFait ? "border-red" : "border-muted";
        const statusHtml = isFait
          ? `<span class="status-badge status-fait">✓ Fait</span>`
          : isPasFait
            ? `<span class="status-badge status-pas-fait">✗ Pas fait</span>`
            : isNc
              ? `<span class="status-badge status-nc">N/A</span>`
              : `<span class="status-badge" style="background:#f1f5f9;color:var(--text-light);">—</span>`;

        html += `<div class="item-card ${borderClass} avoid-break">`;
        html += `<div class="item-card-inner">`;

        // Header
        html += `<div class="item-header">`;
        html += `<div style="flex:1;">`;
        html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">`;
        html += `<span class="item-number">${item.numero}.</span>`;
        html += `<span class="item-title" style="margin:0;">${escapeHtml(item.titre)}</span>`;
        html += `</div>`;
        html += `</div>`;
        html += `<div style="flex-shrink:0;">${statusHtml}</div>`;
        html += `</div>`;

        // Conditions
        if (item.conditions) {
          html += `<div class="detail-block">`;
          html += `<span class="detail-label">Conditions</span>`;
          html += escapeHtml(item.conditions);
          html += `</div>`;
        }

        // Intérêts
        if (item.interets) {
          html += `<div class="detail-block interet">`;
          html += `<span class="detail-label">Intérêts</span>`;
          html += escapeHtml(item.interets);
          html += `</div>`;
        }

        // Conseils
        if (item.conseils) {
          html += `<div class="detail-block comment-parvenir">`;
          html += `<span class="detail-label">Conseils</span>`;
          html += escapeHtml(item.conseils);
          html += `</div>`;
        }

        // Observation
        if (observation) {
          html += `<div class="item-comment">`;
          html += `<span class="comment-label">Observation</span>`;
          html += escapeHtml(observation);
          html += `</div>`;
        }

        html += `</div></div>`;
      }

      // ── Observations globales ──
      if (suivi.observations) {
        html += `<div class="section-title" style="margin-top:16px;">Observations générales</div>`;
        html += `<div class="observations-block">${escapeHtml(suivi.observations)}</div>`;
      }

      // ── Footer ──
      html += `<div class="report-footer">
        <span>DynaPerf — Suivi d'activité</span>
        <span>${formatDateFr(suivi.date)} • ${escapeHtml(suivi.agence)}</span>
      </div>`;

      openPrintWindow(`Suivi — ${suivi.agence} — ${formatDateFr(suivi.date)}`, html);
      toast.success("Rapport prêt !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du rapport");
    }
  };

  return (
    <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5">
      <FontAwesomeIcon icon={faFilePdf} className="h-3.5 w-3.5" /> PDF détaillé
    </Button>
  );
}
