import { openPrintWindow, escapeHtml, formatNow } from "./printPdf";

interface YearData {
  year: number;
  label: string;
  newAvantages: number;
  renewedAvantages: number;
  totalAvantages: number;
  caAvantages: number;
  commAvantages: number;
  newClubMembers: number;
  renewedClubMembers: number;
  totalClubMembers: number;
  caClubs: number;
  commClubs: number;
  oneShotRD: number;
  caOneShotRD: number;
  commOneShotRD: number;
  oneShotAvantages: number;
  caOneShotAvantages: number;
  commOneShotAvantages: number;
  filleuls: number;
  caFilleuls: number;
  commFilleuls: number;
  totalCA: number;
  totalCommissions: number;
  redevanceAnnuelle: number;
  droitsEntree: number;
  totalCharges: number;
  beneficeNet: number;
  cumulBenefice: number;
}

interface BPParams {
  nbAnnees: number;
  nbAvantagesAnN: number;
  nbClubs: number;
  membresParClub: number;
  croissanceAnnuelle: number;
  tauxResiliation: number;
  prixAvantages: number;
  prixClub: number;
  commAvantagesEffective: number;
  commClubPct: number;
  redevanceMensuelle: number;
  droitsEntree: number;
  oneShotRDParAn: number;
  prixOneShotRD: number;
  commOneShotRDPct: number;
  oneShotAvantagesParAn: number;
  prixOneShotAvantages: number;
  commOneShotAvantagesPct: number;
  tauxParrainage: number;
  commissionFilleulEuros: number;
  tauxConversionFilleul: number;
  packPerformance: boolean;
  vehiculeFloque: boolean;
}

const fmtEur = (n: number) => {
  const raw = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  return raw.replace(/[\u00A0\u202F]/g, " ");
};

const fmtNum = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function buildSvgBarChart(projections: YearData[]): string {
  const W = 520, H = 200, pad = { t: 20, r: 20, b: 40, l: 60 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const maxVal = Math.max(...projections.map(p => Math.max(p.beneficeNet, p.cumulBenefice)), 1);
  const barW = Math.min(36, chartW / projections.length * 0.6);
  const gap = chartW / projections.length;

  let bars = "";
  let line = "";
  const points: string[] = [];

  projections.forEach((p, i) => {
    const x = pad.l + i * gap + gap / 2;
    const barH = (p.beneficeNet / maxVal) * chartH;
    const barY = pad.t + chartH - barH;
    bars += `<rect x="${x - barW / 2}" y="${barY}" width="${barW}" height="${barH}" fill="#22c55e" rx="3" opacity="0.85"/>`;
    // Label under
    bars += `<text x="${x}" y="${H - 8}" text-anchor="middle" font-size="8" fill="#64748b">${escapeHtml(p.label)}</text>`;
    // Value on bar
    bars += `<text x="${x}" y="${barY - 4}" text-anchor="middle" font-size="7" fill="#166534" font-weight="600">${fmtEur(p.beneficeNet)}</text>`;
    // Line point
    const ly = pad.t + chartH - (p.cumulBenefice / maxVal) * chartH;
    points.push(`${x},${ly}`);
  });

  if (points.length > 1) {
    line = `<polyline points="${points.join(" ")}" fill="none" stroke="#e20a1e" stroke-width="2.5" stroke-linejoin="round"/>`;
    points.forEach((pt, i) => {
      line += `<circle cx="${pt.split(",")[0]}" cy="${pt.split(",")[1]}" r="4" fill="#e20a1e"/>`;
      line += `<text x="${pt.split(",")[0]}" y="${Number(pt.split(",")[1]) - 8}" text-anchor="middle" font-size="7" fill="#e20a1e" font-weight="600">${fmtEur(projections[i].cumulBenefice)}</text>`;
    });
  }

  // Y axis
  let yAxis = "";
  for (let i = 0; i <= 4; i++) {
    const val = (maxVal / 4) * i;
    const yy = pad.t + chartH - (val / maxVal) * chartH;
    yAxis += `<line x1="${pad.l}" y1="${yy}" x2="${W - pad.r}" y2="${yy}" stroke="#e2e8f0" stroke-width="0.5"/>`;
    yAxis += `<text x="${pad.l - 4}" y="${yy + 3}" text-anchor="end" font-size="7" fill="#94a3b8">${fmtEur(val)}</text>`;
  }

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:0 auto;">
    ${yAxis}${bars}${line}
    <text x="${W / 2}" y="${H}" text-anchor="middle" font-size="8" fill="#94a3b8">
    </text>
  </svg>
  <div style="display:flex;gap:16px;justify-content:center;margin-top:4px;font-size:8px;color:#64748b;">
    <span><span style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:2px;vertical-align:middle;margin-right:3px;"></span> Bénéfice net</span>
    <span><span style="display:inline-block;width:10px;height:3px;background:#e20a1e;border-radius:1px;vertical-align:middle;margin-right:3px;"></span> Cumul bénéfice</span>
  </div>`;
}

function buildSvgRevenueChart(projections: YearData[]): string {
  const W = 520, H = 200, pad = { t: 20, r: 20, b: 40, l: 60 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const gap = chartW / projections.length;

  const stacks = projections.map(p => [
    { val: p.commAvantages, color: "#e20a1e", label: "Avantages" },
    { val: p.commClubs, color: "#f59e0b", label: "Clubs" },
    { val: p.commOneShotRD, color: "#3b82f6", label: "One-shot RD" },
    { val: p.commOneShotAvantages, color: "#06b6d4", label: "One-shot Av." },
    { val: p.commFilleuls, color: "#a855f7", label: "Filleuls" },
  ]);

  const maxVal = Math.max(...stacks.map(s => s.reduce((a, c) => a + c.val, 0)), 1);
  let rects = "";

  projections.forEach((p, i) => {
    const x = pad.l + i * gap + gap / 2;
    const barW = Math.min(36, gap * 0.6);
    let cumY = 0;
    stacks[i].forEach(s => {
      const h = (s.val / maxVal) * chartH;
      const yy = pad.t + chartH - cumY - h;
      rects += `<rect x="${x - barW / 2}" y="${yy}" width="${barW}" height="${h}" fill="${s.color}" rx="1" opacity="0.85"/>`;
      cumY += h;
    });
    // total on top
    const total = stacks[i].reduce((a, c) => a + c.val, 0);
    const topY = pad.t + chartH - cumY;
    rects += `<text x="${x}" y="${topY - 4}" text-anchor="middle" font-size="7" fill="#0E222C" font-weight="600">${fmtEur(total)}</text>`;
    rects += `<text x="${x}" y="${H - 8}" text-anchor="middle" font-size="8" fill="#64748b">${escapeHtml(p.label)}</text>`;
  });

  // Y axis
  let yAxis = "";
  for (let i = 0; i <= 4; i++) {
    const val = (maxVal / 4) * i;
    const yy = pad.t + chartH - (val / maxVal) * chartH;
    yAxis += `<line x1="${pad.l}" y1="${yy}" x2="${W - pad.r}" y2="${yy}" stroke="#e2e8f0" stroke-width="0.5"/>`;
    yAxis += `<text x="${pad.l - 4}" y="${yy + 3}" text-anchor="end" font-size="7" fill="#94a3b8">${fmtEur(val)}</text>`;
  }

  const legendItems = stacks[0].map(s => `<span><span style="display:inline-block;width:10px;height:10px;background:${s.color};border-radius:2px;vertical-align:middle;margin-right:3px;"></span>${s.label}</span>`).join("");

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:0 auto;">
    ${yAxis}${rects}
  </svg>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:4px;font-size:8px;color:#64748b;">
    ${legendItems}
  </div>`;
}

function buildTable(projections: YearData[], params: BPParams): string {
  const cols = projections.length;
  const hdr = projections.map(p => `<th style="text-align:right;padding:5px 8px;white-space:nowrap;">${escapeHtml(p.label)}</th>`).join("");

  const row = (label: string, vals: number[], money = false, bold = false, highlight = false, negative = false) => {
    const bg = highlight ? "background:#f0fdf4;" : "";
    const fw = bold ? "font-weight:700;" : "";
    const cells = vals.map(v => {
      const txt = money ? fmtEur(v) : fmtNum(v);
      const col = negative && v < 0 ? "color:#ef4444;" : highlight ? "color:#166534;" : "";
      return `<td style="text-align:right;padding:4px 8px;white-space:nowrap;${fw}${col}">${txt}</td>`;
    }).join("");
    return `<tr style="${bg}"><td style="padding:4px 8px;white-space:nowrap;${fw}${bg}">${escapeHtml(label)}</td>${cells}</tr>`;
  };

  const section = (label: string, color: string) =>
    `<tr><td colspan="${cols + 1}" style="padding:6px 8px;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:0.04em;color:white;background:${color};border-radius:4px;">${escapeHtml(label)}</td></tr>`;

  return `<table style="width:100%;border-collapse:collapse;font-size:9px;">
    <thead>
      <tr style="background:#0E222C;color:white;">
        <th style="text-align:left;padding:5px 8px;"></th>${hdr}
      </tr>
    </thead>
    <tbody>
      ${section("Dynabuy Avantages (abonnement)", "#e20a1e")}
      ${row("Nouveaux contrats", projections.map(p => p.newAvantages))}
      ${row("Contrats reconduits", projections.map(p => p.renewedAvantages))}
      ${row("Total actifs", projections.map(p => p.totalAvantages), false, true)}
      ${row("CA généré", projections.map(p => p.caAvantages), true)}
      ${row("Commission (" + params.commAvantagesEffective + "%)", projections.map(p => p.commAvantages), true, true)}
      
      ${section("Clubs d'affaires (abonnement)", "#f59e0b")}
      ${row("Nouveaux membres", projections.map(p => p.newClubMembers))}
      ${row("Membres reconduits", projections.map(p => p.renewedClubMembers))}
      ${row("Total membres actifs", projections.map(p => p.totalClubMembers), false, true)}
      ${row("CA généré", projections.map(p => p.caClubs), true)}
      ${row("Commission (" + params.commClubPct + "%)", projections.map(p => p.commClubs), true, true)}
      
      ${section("Ventes one-shot", "#b47814")}
      ${row("RD à vie (ventes)", projections.map(p => p.oneShotRD))}
      ${row("CA RD one-shot", projections.map(p => p.caOneShotRD), true)}
      ${row("Commission RD (" + params.commOneShotRDPct + "%)", projections.map(p => p.commOneShotRD), true, true)}
      ${row("Avantages à vie (ventes)", projections.map(p => p.oneShotAvantages))}
      ${row("CA Avantages one-shot", projections.map(p => p.caOneShotAvantages), true)}
      ${row("Commission Av. (" + params.commOneShotAvantagesPct + "%)", projections.map(p => p.commOneShotAvantages), true, true)}
      
      ${section("Parrainage / Filleuls", "#a855f7")}
      ${row("Filleuls convertis", projections.map(p => p.filleuls))}
      ${row("Commissions parrainage", projections.map(p => p.commFilleuls), true, true)}
      
      ${section("Synthèse", "#0E222C")}
      ${row("Total commissions", projections.map(p => p.totalCommissions), true, true, true)}
      ${row("Redevance annuelle", projections.map(p => -p.redevanceAnnuelle), true, false, false, true)}
      ${row("Droits d'entrée", projections.map(p => -p.droitsEntree), true, false, false, true)}
      ${row("Bénéfice net", projections.map(p => p.beneficeNet), true, true, true)}
      ${row("Cumul bénéfice", projections.map(p => p.cumulBenefice), true, true, true)}
    </tbody>
  </table>`;
}

export function exportBusinessPlanPdf(projections: YearData[], params: BPParams): void {
  const firstYear = projections[0];
  const lastYear = projections[projections.length - 1];

  const kpis = [
    { label: "Revenus An 1", value: fmtEur(firstYear?.totalCommissions ?? 0), color: "#e20a1e" },
    { label: `Revenus An ${params.nbAnnees}`, value: fmtEur(lastYear?.totalCommissions ?? 0), color: "#e20a1e" },
    { label: `Bénéfice net An ${params.nbAnnees}`, value: fmtEur(lastYear?.beneficeNet ?? 0), color: "#166534" },
    { label: `Cumul sur ${params.nbAnnees} ans`, value: fmtEur(lastYear?.cumulBenefice ?? 0), color: "#166534" },
  ];

  const kpiHtml = kpis.map(k => `
    <div class="stat-field" style="border-left:3px solid ${k.color};">
      <div class="stat-label">${escapeHtml(k.label)}</div>
      <div class="stat-value" style="color:${k.color};">${k.value}</div>
    </div>
  `).join("");

  const paramRows = [
    [`Contrats Avantages/an : ${params.nbAvantagesAnN}`, `Prix Avantages : ${fmtEur(params.prixAvantages)}`, `Comm. : ${params.commAvantagesEffective}%`],
    [`Clubs : ${params.nbClubs} × ${params.membresParClub} membres`, `Prix Club : ${fmtEur(params.prixClub)}`, `Comm. : ${params.commClubPct}%`],
    [`Croissance : +${params.croissanceAnnuelle}%/an`, `Résiliation : ${params.tauxResiliation}%`, `Redevance : ${fmtEur(params.redevanceMensuelle)}/mois`],
    [`One-shot RD : ${params.oneShotRDParAn}/an × ${fmtEur(params.prixOneShotRD)}`, `One-shot Av. : ${params.oneShotAvantagesParAn}/an × ${fmtEur(params.prixOneShotAvantages)}`, `Parrainage : ${params.tauxParrainage}% → ${params.tauxConversionFilleul}% conv.`],
  ];

  const paramsHtml = paramRows.map(row =>
    `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:9px;color:#64748b;margin-bottom:2px;">
      ${row.map(c => `<span>${escapeHtml(c)}</span>`).join("")}
    </div>`
  ).join("");

  const optionsHtml = `<div style="display:flex;gap:12px;font-size:9px;color:#64748b;margin-top:4px;">
    <span>${params.packPerformance ? "✅" : "—"} Pack Performance</span>
    <span>${params.vehiculeFloque ? "✅" : "—"} Véhicule floqué</span>
    <span>Droits d'entrée : ${fmtEur(params.droitsEntree)}</span>
  </div>`;

  const bodyHtml = `
    <div class="report-header">
      <h1>DynaPerf — Business Plan Partenaire</h1>
      <div class="subtitle">Simulation sur ${params.nbAnnees} ans — Généré le ${formatNow()}</div>
    </div>

    <!-- KPIs -->
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);">${kpiHtml}</div>

    <!-- Params -->
    <div class="section-title">Paramètres de simulation</div>
    ${paramsHtml}
    ${optionsHtml}

    <!-- Chart: Revenue breakdown -->
    <div class="section-title">Évolution des revenus par source</div>
    <div class="avoid-break" style="margin-bottom:12px;">
      ${buildSvgRevenueChart(projections)}
    </div>

    <!-- Chart: Benefit -->
    <div class="section-title">Bénéfice net annuel vs Cumul</div>
    <div class="avoid-break" style="margin-bottom:12px;">
      ${buildSvgBarChart(projections)}
    </div>

    <div class="page-break"></div>

    <!-- Detailed table -->
    <div class="section-title">Projection financière détaillée</div>
    <div class="avoid-break">
      ${buildTable(projections, params)}
    </div>

    <!-- Legal disclaimer -->
    <div style="margin-top:16px;padding:10px 14px;border:1.5px solid #ef4444;border-radius:6px;background:#fef2f2;">
      <div style="font-size:8px;font-weight:700;color:#b91c1c;margin-bottom:3px;text-transform:uppercase;">Avertissement légal</div>
      <div style="font-size:7px;color:#7f1d1d;line-height:1.5;">
        Ce document constitue une simulation à caractère strictement indicatif et prévisionnel. Il ne saurait en aucun cas être considéré comme un engagement contractuel, une promesse de revenus ou une garantie de résultats de la part de Dynabuy SAS. Les chiffres présentés reposent sur des hypothèses variables et ne prennent pas en compte l'ensemble des facteurs économiques, commerciaux et conjoncturels susceptibles d'impacter les résultats réels.
      </div>
    </div>

    <!-- Watermark -->
    <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;font-weight:700;color:rgba(150,150,150,0.06);pointer-events:none;z-index:0;white-space:nowrap;">CONFIDENTIEL</div>

    <div class="report-footer">
      <span>DynaPerf — Dynabuy ${new Date().getFullYear()}</span>
      <span>Document confidentiel — Usage interne</span>
    </div>
  `;

  openPrintWindow(`Business_Plan_Dynabuy_${new Date().toISOString().slice(0, 10)}`, bodyHtml);
}
