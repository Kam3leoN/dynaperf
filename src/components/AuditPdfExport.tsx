import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { resolveAuditPhotoUrls } from "@/lib/storageUtils";
import { fetchAuditConfig } from "@/data/auditItems";
import { toast } from "sonner";
import {
  openPrintWindow,
  escapeHtml,
  formatDateFr,
  formatNow,
  infoFieldHtml,
  statFieldHtml,
  signaturesHtml,
  urlsToDataUrls,
} from "@/lib/printPdf";

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
    toast.info("Préparation du rapport…");

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
      const allItems = config.categories.flatMap((cat, _ci) =>
        cat.items.map((item) => ({ ...item, categoryName: cat.name }))
      );

      // Resolve photos then convert to data URLs for print window
      const rawPhotoUrls = await resolveAuditPhotoUrls((detail.photos as string[]) ?? []);
      const photoUrls = await urlsToDataUrls(rawPhotoUrls);

      // Build HTML
      let html = "";

      // ── Header ──
      const heureEvent = detail.heure_evenement ? ` — à : ${escapeHtml(detail.heure_evenement)}` : "";
      html += `<div class="report-header">
        <h1>Rapport d'Audit (${escapeHtml(typeEvenement)})</h1>
        <div class="subtitle">le : ${formatDateFr(date)}${heureEvent}</div>
      </div>`;

      // ── Informations générales ──
      html += `<div class="section-title">Informations générales</div>`;
      html += `<div class="info-grid">`;
      html += infoFieldHtml("Partenaire audité", partenaire);
      html += infoFieldHtml("Partenaire référent", detail.partenaire_referent);
      html += infoFieldHtml("Auditeur", auditeur);
      html += infoFieldHtml("Ville", lieu);
      html += infoFieldHtml("Lieu", detail.type_lieu);
      html += infoFieldHtml("Qualité du lieu", detail.qualite_lieu != null ? "★".repeat(detail.qualite_lieu) + "☆".repeat(5 - detail.qualite_lieu) : null);
      html += infoFieldHtml("Date", formatDateFr(date));
      html += infoFieldHtml("Heure", detail.heure_evenement);
      if (detail.nom_club) html += infoFieldHtml("Club", detail.nom_club);
      html += `</div>`;

      // ── Stats ──
      const hasStats = detail.nb_adherents != null || detail.nb_invites != null || detail.nb_participants != null;
      if (hasStats) {
        html += `<div class="stats-grid">`;
        if (detail.nb_adherents != null) html += statFieldHtml("Adhérents", detail.nb_adherents);
        if (detail.nb_invites != null) html += statFieldHtml("Invités", detail.nb_invites);
        if (detail.nb_no_show != null) html += statFieldHtml("No-show", detail.nb_no_show);
        if (detail.nb_participants != null) html += statFieldHtml("Participants", detail.nb_participants);
        if (detail.nb_rdv_pris != null) html += statFieldHtml("RDV pris", detail.nb_rdv_pris);
        html += `</div>`;

        // Ratios
        const ratioInv = detail.nb_invites && detail.nb_participants && detail.nb_participants > 0
          ? ((detail.nb_invites / detail.nb_participants) * 100).toFixed(1) : null;
        const ratioRdv = detail.nb_rdv_pris != null && detail.nb_invites && detail.nb_invites > 0
          ? ((detail.nb_rdv_pris / detail.nb_invites) * 100).toFixed(1) : null;
        if (ratioInv || ratioRdv) {
          html += `<div class="info-grid" style="margin-top:6px;">`;
          if (ratioInv) html += infoFieldHtml("Ratio invités / participants", `${ratioInv}%`);
          if (ratioRdv) html += infoFieldHtml("Ratio RDV pris / invités", `${ratioRdv}%`);
          html += `</div>`;
        }
      }

      // ── Score global ──
      html += `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">`;
      html += `<span class="badge badge-secondary">Total : ${detail.total_points ?? "—"} pts</span>`;
      html += `<span class="badge badge-secondary">Note : ${detail.note_sur_10 ?? note ?? "—"}/10</span>`;
      html += `</div>`;

      // ── Score par catégorie ──
      html += `<div style="margin-top:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;">`;
      for (const cat of config.categories) {
        const catItems = allItems.filter((i) => i.categoryId === cat.id);
        if (catItems.length === 0) continue;
        const catMax = catItems.reduce((s, i) => s + i.maxPoints, 0);
        const catObt = catItems.reduce((s, i) => s + (items[i.id]?.score ?? 0), 0);
        const pct = catMax > 0 ? Math.round((catObt / catMax) * 100) : 0;
        const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
        html += `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:6px 8px;">`;
        html += `<div style="font-size:9px;color:#6b7280;margin-bottom:2px;">${escapeHtml(cat.name)}</div>`;
        html += `<div style="font-size:13px;font-weight:700;">${catObt}<span style="font-size:10px;color:#9ca3af;font-weight:400;"> / ${catMax} pts</span></div>`;
        html += `<div style="height:4px;border-radius:2px;background:#e5e7eb;margin-top:3px;"><div style="height:100%;border-radius:2px;width:${pct}%;background:${color};"></div></div>`;
        html += `<div style="font-size:9px;color:#6b7280;text-align:right;margin-top:1px;">${pct}%</div>`;
        html += `</div>`;
      }
      html += `</div>`;

      // ── Items par catégorie ──
      let globalIdx = 0;
      for (const cat of config.categories) {
        const catItems = allItems.filter((i) => i.categoryId === cat.id);
        if (catItems.length === 0) continue;
        const catMax = catItems.reduce((s, i) => s + i.maxPoints, 0);
        const catObt = catItems.reduce((s, i) => s + (items[i.id]?.score ?? 0), 0);
        html += `<div class="cat-header">${escapeHtml(cat.name)} <span style="float:right;font-size:11px;font-weight:600;">${catObt}/${catMax} pts</span></div>`;

        for (const item of catItems) {
          globalIdx++;
          const answer = items[item.id];
          const score = answer?.score ?? 0;
          const isMax = score === item.maxPoints;
          const hasScore = score > 0;
          const isTouched = answer !== undefined;
          const isExplicitZero = isTouched && score === 0;
          const borderClass = isMax ? "border-emerald" : hasScore ? "border-amber" : isExplicitZero ? "border-red" : "border-muted";
          const badgeClass = isMax ? "badge-emerald" : hasScore ? "badge-amber" : isExplicitZero ? "badge-red" : "badge-muted";

          html += `<div class="item-card ${borderClass} avoid-break">`;
          html += `<div class="item-card-inner">`;

          // Header row
          html += `<div class="item-header">`;
          html += `<div style="flex:1;min-width:0;">`;
          html += `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:2px;">`;
          html += `<span class="item-number">${globalIdx}.</span>`;
          html += `<span class="badge badge-secondary">${escapeHtml(item.categoryName)}</span>`;
          html += `<span class="badge ${badgeClass}">${score}/${item.maxPoints} pts</span>`;
          if (item.autoField) {
            html += `<span class="badge badge-muted">🔒 Auto</span>`;
          }
          html += `</div>`;
          html += `<div class="item-title">${escapeHtml(item.title)}</div>`;
          html += `</div>`;
          html += `<div style="flex-shrink:0;font-size:14px;">${isMax ? '<span class="item-icon-ok">✓</span>' : '<span class="item-icon-ko">✗</span>'}</div>`;
          html += `</div>`;

          // Description / condition
          if (item.description || item.condition) {
            html += `<div class="detail-block">`;
            if (item.description) html += `<div>${escapeHtml(item.description)}</div>`;
            if (item.condition) html += `<div style="margin-top:2px;">ℹ️ ${escapeHtml(item.condition)}</div>`;
            // Scoring rules inline
            if (item.scoringRules) html += `<div style="margin-top:3px;padding-top:3px;border-top:1px solid var(--border);">${escapeHtml(item.scoringRules)}</div>`;
            html += `</div>`;
          }

          // Intérêts
          if (item.interets) {
            html += `<div class="detail-block interet">`;
            html += `<span class="detail-label">Quel intérêt ?</span>`;
            html += `${escapeHtml(item.interets)}`;
            html += `</div>`;
          }

          // Comment y parvenir
          if (item.commentYParvenir) {
            html += `<div class="detail-block comment-parvenir">`;
            html += `<span class="detail-label">Comment y parvenir ?</span>`;
            html += `${escapeHtml(item.commentYParvenir)}`;
            html += `</div>`;
          }

          // Number value
          if (item.inputType === "number" && answer?.rawValue !== undefined) {
            html += `<div class="detail-block">`;
            html += `<span style="color:var(--text-muted);">Valeur saisie : </span>`;
            html += `<strong>${answer.rawValue}</strong>`;
            html += `</div>`;
          }

          // Checklist
          if (item.inputType === "checklist" && item.checklistItems && answer?.checklist) {
            for (let ci = 0; ci < item.checklistItems.length; ci++) {
              const checked = answer.checklist[ci] ?? false;
              html += `<div class="checklist-item ${checked ? "checked" : ""}">`;
              html += `<span class="check-icon ${checked ? "check-ok" : "check-ko"}">${checked ? "✓" : "✗"}</span>`;
              html += `<span>${escapeHtml(item.checklistItems[ci])}</span>`;
              html += `</div>`;
            }
          }

          // Comment
          if (answer?.comment) {
            html += `<div class="item-comment">`;
            html += `<span class="comment-label">Commentaire</span>`;
            html += escapeHtml(answer.comment);
            html += `</div>`;
          }

          html += `</div></div>`; // close item-card-inner + item-card
        }
      }

      // ── Photos ──
      if (photoUrls.length > 0) {
        html += `<div class="section-title" style="margin-top:16px;">📷 Photos (${photoUrls.length})</div>`;
        html += `<div class="photos-grid">`;
        for (const url of photoUrls) {
          html += `<img src="${url}" alt="Photo audit" />`;
        }
        html += `</div>`;
      }

      // ── Signatures ──
      html += signaturesHtml(
        auditeur,
        (detail as any).signature_auditeur,
        partenaire,
        (detail as any).signature_audite,
      );

      // ── Footer ──
      html += `<div class="report-footer">
        <span>DynaPerf — Rapport d'audit</span>
        <span>${formatDateFr(date)} • ${escapeHtml(partenaire)}</span>
      </div>`;

      openPrintWindow(`Audit — ${partenaire} — ${formatDateFr(date)}`, html);
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
