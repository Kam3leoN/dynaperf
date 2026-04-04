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

interface CustomFieldDef {
  id: string;
  field_label: string;
  field_type: string;
  field_options: any;
  sort_order: number;
}

export function AuditPdfExport({ auditId, partenaire, typeEvenement, date, lieu, auditeur, note }: AuditPdfExportProps) {
  const handleExport = async () => {
    toast.info("Préparation du rapport…");

    try {
      const [{ data: detail }, config, { data: customFields }] = await Promise.all([
        supabase.from("audit_details").select("*").eq("audit_id", auditId).single(),
        fetchAuditConfig(typeEvenement),
        supabase.from("audit_type_custom_fields").select("*").eq("audit_type_key", typeEvenement).order("sort_order"),
      ]);

      if (!detail || !config) {
        toast.error("Impossible de charger les détails de l'audit");
        return;
      }

      const items = (detail.items as Record<string, any>) ?? {};
      const customFieldValues: Record<string, any> = items.__custom_fields || {};
      const fields = (customFields as CustomFieldDef[]) || [];
      const allItems = config.categories.flatMap((cat) =>
        cat.items.map((item) => ({ ...item, categoryName: cat.name }))
      );

      const rawPhotoUrls = await resolveAuditPhotoUrls((detail.photos as string[]) ?? []);
      const photoUrls = await urlsToDataUrls(rawPhotoUrls);

      let html = "";

      // ── Header ──
      const heureEvent = detail.heure_evenement ? ` — à : ${escapeHtml(detail.heure_evenement)}` : "";
      html += `<div class="report-header">
        <h1>Rapport d'Audit (${escapeHtml(typeEvenement)})</h1>
        <div class="subtitle">le : ${formatDateFr(date)}${heureEvent}</div>
      </div>`;

      // ── Informations générales (dynamic) ──
      html += `<div class="section-title">Informations générales</div>`;

      const isStatType = (ft: string) => ["number", "stat_percent", "stat_sum", "stat_diff"].includes(ft);
      const isRatingType = (ft: string) => ["qualite_lieu_rating", "qualite_rating", "rating"].includes(ft);

      const getDisplayValue = (f: CustomFieldDef): string | null => {
        const val = customFieldValues[f.id];
        if (val === undefined || val === null || val === "") return null;
        if (isRatingType(f.field_type)) {
          const n = typeof val === "number" ? val : parseInt(val) || 0;
          return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
        }
        if (f.field_type === "stat_percent") return `${val} %`;
        if (f.field_type === "stat_sum") return `${val > 0 ? "+" : ""}${val}`;
        if (f.field_type === "date_picker") {
          try { return new Date(val).toLocaleDateString("fr-FR"); } catch { return String(val); }
        }
        if (f.field_type === "checkbox") return Array.isArray(val) ? val.join(", ") : String(val);
        return String(val);
      };

      if (fields.length > 0) {
        // Dynamic fields
        const infoFields = fields.filter(f => !isStatType(f.field_type));
        const statFields = fields.filter(f => isStatType(f.field_type));

        if (infoFields.length > 0) {
          html += `<div class="info-grid">`;
          for (const f of infoFields) {
            html += infoFieldHtml(f.field_label, getDisplayValue(f));
          }
          html += `</div>`;
        }

        if (statFields.length > 0) {
          html += `<div class="stats-grid">`;
          for (const f of statFields) {
            const val = customFieldValues[f.id];
            if (val !== undefined && val !== null && val !== "") {
              html += statFieldHtml(f.field_label, val);
            }
          }
          html += `</div>`;
        }
      } else {
        // Legacy fallback
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

        const hasStats = detail.nb_adherents != null || detail.nb_invites != null || detail.nb_participants != null;
        if (hasStats) {
          html += `<div class="stats-grid">`;
          if (detail.nb_adherents != null) html += statFieldHtml("Adhérents", detail.nb_adherents);
          if (detail.nb_invites != null) html += statFieldHtml("Invités", detail.nb_invites);
          if (detail.nb_no_show != null) html += statFieldHtml("No-show", detail.nb_no_show);
          if (detail.nb_participants != null) html += statFieldHtml("Participants", detail.nb_participants);
          if (detail.nb_rdv_pris != null) html += statFieldHtml("RDV pris", detail.nb_rdv_pris);
          html += `</div>`;
        }
      }

      // ── Items par catégorie ──
      let globalIdx = 0;
      for (const cat of config.categories) {
        const catItems = allItems.filter((i) => i.categoryId === cat.id);
        if (catItems.length === 0) continue;
        const catMax = catItems.reduce((s, i) => s + i.maxPoints, 0);
        const catObt = catItems.reduce((s, i) => s + (items[i.id]?.score ?? 0), 0);
        html += `<div class="cat-header" style="font-size:14px;">${escapeHtml(cat.name)} <span style="float:right;font-size:11px;font-weight:600;">${catObt}/${catMax} pts</span></div>`;

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

          html += `<div class="item-header">`;
          html += `<div style="flex:1;min-width:0;">`;
          html += `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:2px;">`;
          html += `<span class="item-number">${globalIdx}.</span>`;
          html += `<span class="item-title" style="margin-bottom:0;">${escapeHtml(item.title)}</span>`;
          html += `<span class="badge ${badgeClass}">${score}/${item.maxPoints} pts</span>`;
          if (item.autoField) {
            html += `<span class="badge badge-muted">🔒 Auto</span>`;
          }
          html += `</div>`;
          html += `</div>`;
          html += `<div style="flex-shrink:0;font-size:14px;">${isMax ? '<span class="item-icon-ok">✓</span>' : '<span class="item-icon-ko">✗</span>'}</div>`;
          html += `</div>`;

          if (item.description || item.condition) {
            html += `<div class="detail-block">`;
            if (item.description) html += `<div>${escapeHtml(item.description)}</div>`;
            if (item.condition) html += `<div style="margin-top:2px;">ℹ️ ${escapeHtml(item.condition)}</div>`;
            if (item.scoringRules) html += `<div style="margin-top:3px;padding-top:3px;border-top:1px solid var(--border);">${escapeHtml(item.scoringRules)}</div>`;
            html += `</div>`;
          }

          if (item.interets) {
            html += `<div class="detail-block interet">`;
            html += `<span class="detail-label">Quel intérêt ?</span>`;
            html += `${escapeHtml(item.interets)}`;
            html += `</div>`;
          }

          if (item.commentYParvenir) {
            html += `<div class="detail-block comment-parvenir">`;
            html += `<span class="detail-label">Comment y parvenir ?</span>`;
            html += `${escapeHtml(item.commentYParvenir)}`;
            html += `</div>`;
          }

          if (item.inputType === "number" && answer?.rawValue !== undefined) {
            html += `<div class="detail-block">`;
            html += `<span style="color:var(--text-muted);">Valeur saisie : </span>`;
            html += `<strong>${answer.rawValue}</strong>`;
            html += `</div>`;
          }

          if (item.inputType === "checklist" && item.checklistItems && answer?.checklist) {
            for (let ci = 0; ci < item.checklistItems.length; ci++) {
              const checked = answer.checklist[ci] ?? false;
              html += `<div class="checklist-item ${checked ? "checked" : ""}">`;
              html += `<span class="check-icon ${checked ? "check-ok" : "check-ko"}">${checked ? "✓" : "✗"}</span>`;
              html += `<span>${escapeHtml(item.checklistItems[ci])}</span>`;
              html += `</div>`;
            }
          }

          if (answer?.comment) {
            html += `<div class="item-comment">`;
            html += `<span class="comment-label">Commentaire</span>`;
            html += escapeHtml(answer.comment);
            html += `</div>`;
          }

          html += `</div></div>`;
        }
      }

      // ── Score global + par catégorie (en fin d'audit) ──
      html += `<div class="section-title" style="margin-top:16px;">Résultats</div>`;
      html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">`;
      html += `<span class="badge badge-secondary">Total : ${detail.total_points ?? "—"} pts</span>`;
      html += `<span class="badge badge-secondary">Note : ${detail.note_sur_10 ?? note ?? "—"}/10</span>`;
      html += `</div>`;
      html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin-bottom:12px;">`;
      for (const cat of config.categories) {
        const catItems2 = allItems.filter((i) => i.categoryId === cat.id);
        if (catItems2.length === 0) continue;
        const catMax2 = catItems2.reduce((s, i) => s + i.maxPoints, 0);
        const catObt2 = catItems2.reduce((s, i) => s + (items[i.id]?.score ?? 0), 0);
        const pct2 = catMax2 > 0 ? Math.round((catObt2 / catMax2) * 100) : 0;
        const color2 = pct2 >= 80 ? "#22c55e" : pct2 >= 50 ? "#f59e0b" : "#ef4444";
        html += `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:6px 8px;">`;
        html += `<div style="font-size:9px;color:#6b7280;margin-bottom:2px;">${escapeHtml(cat.name)}</div>`;
        html += `<div style="font-size:13px;font-weight:700;">${catObt2}<span style="font-size:10px;color:#9ca3af;font-weight:400;"> / ${catMax2} pts</span></div>`;
        html += `<div style="height:4px;border-radius:2px;background:#e5e7eb;margin-top:3px;"><div style="height:100%;border-radius:2px;width:${pct2}%;background:${color2};"></div></div>`;
        html += `<div style="font-size:9px;color:#6b7280;text-align:right;margin-top:1px;">${pct2}%</div>`;
        html += `</div>`;
      }
      html += `</div>`;

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
