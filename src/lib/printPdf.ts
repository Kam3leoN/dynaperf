/**
 * PDF generation service using browser's native print (Chromium rendering).
 * Opens a styled HTML document in a new window and triggers window.print().
 * This gives pixel-perfect PDF output matching the web UI.
 */

const PRINT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --mineral: #0E222C;
  --mineral-light: #1a3a4a;
  --bg: #f7f7f7;
  --card: #ffffff;
  --border: #e2e8f0;
  --border-light: #f1f5f9;
  --text: #0E222C;
  --text-muted: #64748b;
  --text-light: #94a3b8;
  --emerald: #22c55e;
  --emerald-bg: #dcfce7;
  --emerald-text: #166534;
  --amber: #f59e0b;
  --amber-bg: #fef3c7;
  --amber-text: #92400e;
  --red: #ef4444;
  --red-bg: #fee2e2;
  --red-text: #991b1b;
  --blue-bg: #eff6ff;
  --blue-text: #1e40af;
  --green-bg: #f0fdf4;
  --green-text: #166534;
  --muted-bg: #f8fafc;
}

body {
  font-family: 'Lexend', system-ui, -apple-system, sans-serif;
  font-size: 10px;
  line-height: 1.5;
  color: var(--text);
  background: white;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

@page {
  size: A4;
  margin: 12mm 14mm 16mm 14mm;
}

@media print {
  body { background: white; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
  .avoid-break { page-break-inside: avoid; }
}

/* ── Header ── */
.report-header {
  background: var(--mineral);
  color: white;
  padding: 18px 22px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.report-header h1 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}
.report-header .subtitle {
  font-size: 10px;
  opacity: 0.8;
}

/* ── Section title ── */
.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text);
  border-bottom: 2px solid var(--border);
  padding-bottom: 6px;
  margin: 16px 0 10px 0;
}

/* ── Category header ── */
.cat-header {
  background: var(--mineral);
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 6px 12px;
  border-radius: 6px;
  margin: 14px 0 8px 0;
}

/* ── Info grid ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.info-field {
  background: var(--muted-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
}
.info-field .label {
  font-size: 8px;
  color: var(--text-muted);
  margin-bottom: 1px;
}
.info-field .value {
  font-size: 10px;
  font-weight: 500;
  color: var(--text);
}

/* ── Stats grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 6px;
  margin-top: 8px;
}
.stat-field {
  border: 1px solid var(--border);
  background: var(--muted-bg);
  border-radius: 6px;
  padding: 8px;
  text-align: center;
}
.stat-field .stat-value {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.stat-field .stat-label {
  font-size: 8px;
  color: var(--text-muted);
}

/* ── Score badges ── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
}
.badge-emerald { background: var(--emerald-bg); color: var(--emerald-text); }
.badge-amber { background: var(--amber-bg); color: var(--amber-text); }
.badge-red { background: var(--red-bg); color: var(--red-text); }
.badge-muted { background: #f1f5f9; color: var(--text-muted); }
.badge-secondary { background: #f1f5f9; color: var(--text); }

/* ── Item card ── */
.item-card {
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 6px;
  overflow: hidden;
  page-break-inside: avoid;
}
.item-card-inner {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.item-card .border-bar {
  width: 3px;
  flex-shrink: 0;
}
.item-card-row {
  display: flex;
  align-items: flex-start;
}
.border-emerald { border-left: 3px solid var(--emerald); }
.border-amber { border-left: 3px solid var(--amber); }
.border-muted { border-left: 3px solid var(--border); }
.border-red { border-left: 3px solid var(--red); }

.item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}
.item-number {
  font-size: 9px;
  color: var(--text-muted);
  font-family: monospace;
  margin-right: 4px;
}
.item-title {
  font-size: 10px;
  font-weight: 600;
  color: var(--text);
  flex: 1;
}
.item-icon-ok { color: var(--emerald); font-weight: 700; }
.item-icon-ko { color: var(--red); font-weight: 700; }

/* ── Detail blocks ── */
.detail-block {
  background: var(--muted-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 9px;
  color: var(--text-muted);
  line-height: 1.4;
}
.detail-block.interet { background: var(--green-bg); border-color: #bbf7d0; }
.detail-block.interet .detail-label { color: var(--green-text); font-weight: 600; }
.detail-block.comment-parvenir { background: var(--blue-bg); border-color: #bfdbfe; }
.detail-block.comment-parvenir .detail-label { color: var(--blue-text); font-weight: 600; }
.detail-block .detail-label { font-size: 8px; font-weight: 600; display: block; margin-bottom: 1px; }

/* ── Checklist ── */
.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 9px;
  margin-bottom: 3px;
}
.checklist-item.checked {
  border-color: #bbf7d0;
  background: var(--green-bg);
}
.check-icon { font-weight: 700; flex-shrink: 0; }
.check-ok { color: var(--emerald); }
.check-ko { color: var(--text-muted); }

/* ── Comment ── */
.item-comment {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 9px;
  font-style: italic;
  color: var(--text-muted);
}
.item-comment .comment-label { font-weight: 600; font-style: normal; display: block; margin-bottom: 1px; font-size: 8px; }

/* ── Suivi status ── */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
}
.status-fait { background: var(--emerald-bg); color: var(--emerald-text); }
.status-pas-fait { background: var(--red-bg); color: var(--red-text); }
.status-nc { background: #f1f5f9; color: var(--text-muted); }

/* ── Photos ── */
.photos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 8px;
}
.photos-grid img {
  width: 100%;
  height: auto;
  border-radius: 6px;
  border: 1px solid var(--border);
  object-fit: cover;
  aspect-ratio: 16/10;
}

/* ── Footer ── */
.report-footer {
  margin-top: 20px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  color: var(--text-light);
}

/* ── Observations ── */
.observations-block {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 10px;
  line-height: 1.6;
  white-space: pre-line;
  margin-top: 8px;
}

/* ── Print toolbar ── */
.print-toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: var(--mineral);
  color: white;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 9999;
  font-size: 13px;
}
.print-toolbar button {
  background: white;
  color: var(--mineral);
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.print-toolbar button:hover { opacity: 0.9; }

@media print {
  .print-toolbar { display: none !important; }
  body { padding-top: 0 !important; }
}

@media screen {
  body { 
    padding-top: 52px; 
    background: #f1f5f9;
  }
  .print-page {
    max-width: 210mm;
    margin: 16px auto;
    background: white;
    padding: 14mm;
    box-shadow: 0 2px 20px rgba(0,0,0,0.1);
    border-radius: 4px;
  }
}
`;

/**
 * Opens a new window with the given HTML content and auto-triggers print dialog.
 */
export function openPrintWindow(title: string, bodyHtml: string): void {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Veuillez autoriser les popups pour générer le PDF.");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="print-toolbar no-print">
    <span>📄 ${escapeHtml(title)}</span>
    <div style="display:flex;gap:8px;">
      <button onclick="window.print()">⬇ Télécharger PDF</button>
      <button onclick="window.close()" style="background:#374151;color:white;">Fermer</button>
    </div>
  </div>
  <div class="print-page">
    ${bodyHtml}
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();

  // Auto-trigger print after fonts load
  win.onload = () => {
    setTimeout(() => win.print(), 400);
  };
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatNow(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Build an info field HTML block */
export function infoFieldHtml(label: string, value: string | null | undefined): string {
  return `<div class="info-field">
    <div class="label">${escapeHtml(label)}</div>
    <div class="value">${escapeHtml(value || "—")}</div>
  </div>`;
}

/** Build a stat field HTML block */
export function statFieldHtml(label: string, value: number | string): string {
  return `<div class="stat-field">
    <div class="stat-value">${escapeHtml(String(value))}</div>
    <div class="stat-label">${escapeHtml(label)}</div>
  </div>`;
}
