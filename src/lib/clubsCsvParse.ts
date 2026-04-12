/**
 * Parse et comparaison d’exports CSV clubs (séparateur `;`, champs entre guillemets),
 * aligné sur `scripts/import-clubs-csv.mjs`.
 */

export interface ParsedClubRow {
  nom: string;
  format: string;
  president_nom: string;
  agence_rattachement: string | null;
  agence_mere: string | null;
  telephone_president: string | null;
  email_president: string | null;
  adresse: string | null;
  departement: string | null;
  statut: string;
  nb_membres_actifs: number;
  nb_leads_transformes: number;
  montant_ca: number;
  date_creation: string | null;
  date_desactivation: string | null;
}

export interface FieldChange {
  key: keyof ParsedClubRow;
  label: string;
  before: string;
  after: string;
}

/** Clé de rapprochement : insensible à la casse, espaces normalisés. */
export function normalizeClubKey(nom: string): string {
  return nom.trim().replace(/\s+/g, " ").toLowerCase();
}

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ";") {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function decodeCsvTextFromArrayBuffer(buf: ArrayBuffer): string {
  const u8 = new Uint8Array(buf);
  if (u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(u8.subarray(3));
  }
  return new TextDecoder("windows-1252").decode(u8);
}

function parseFrDate(s: string | undefined): string | null {
  if (!s || !String(s).trim()) return null;
  const t = String(s).trim();
  const p = t.split("/");
  if (p.length !== 3) return null;
  const d = parseInt(p[0], 10);
  const m = parseInt(p[1], 10);
  const y = parseInt(p[2], 10);
  if (!y || !m || !d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseAmount(raw: string | undefined): number {
  if (raw == null) return 0;
  let s = String(raw).trim().replace(/\s/g, "");
  if (!s) return 0;
  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(,\d{3})*\.\d+/.test(s)) {
    return parseFloat(s.replace(/,/g, ""));
  }
  if (/^\d+,\d{1,2}$/.test(s) && !s.includes(".")) {
    return parseFloat(s.replace(",", "."));
  }
  const n = parseFloat(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseIntSafe(s: string | undefined): number {
  const n = parseInt(String(s).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export function mapStatutCsv(csv: string | undefined): string {
  const t = String(csv || "").trim();
  if (t === "Actif") return "Actif";
  if (t === "Inactif") return "Désactivé";
  if (t === "Annulé") return "Archivé";
  return "Actif";
}

function emptyToNull(s: string | undefined): string | null {
  const t = (s ?? "").trim();
  return t.length ? t : null;
}

export function cellsToParsedRow(cells: string[]): ParsedClubRow | null {
  if (cells.length < 10) return null;
  const nom = cells[0]?.trim();
  if (!nom) return null;
  return {
    nom,
    format: cells[1]?.trim() || "Développement",
    president_nom: cells[2]?.trim() || "",
    agence_rattachement: emptyToNull(cells[3]),
    agence_mere: emptyToNull(cells[4]),
    telephone_president: emptyToNull(cells[5]),
    email_president: emptyToNull(cells[6]),
    adresse: emptyToNull(cells[7]),
    departement: emptyToNull(cells[8]),
    statut: mapStatutCsv(cells[9]),
    nb_membres_actifs: parseIntSafe(cells[10]),
    nb_leads_transformes: parseIntSafe(cells[11]),
    montant_ca: parseAmount(cells[12]),
    date_creation: parseFrDate(cells[13]),
    date_desactivation: parseFrDate(cells[14]),
  };
}

export type ParseClubsCsvResult =
  | { ok: true; rows: ParsedClubRow[]; duplicateNomInCsv: number; linesSkipped: number }
  | { ok: false; error: string };

/**
 * Parse le texte CSV complet (1ère ligne = en-têtes, ignorée).
 */
export function parseClubsCsvText(raw: string): ParseClubsCsvResult {
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "Fichier vide ou sans ligne de données." };
  }

  const byKey = new Map<string, ParsedClubRow>();
  let linesSkipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = cellsToParsedRow(cells);
    if (!row) {
      linesSkipped++;
      continue;
    }
    byKey.set(normalizeClubKey(row.nom), row);
  }

  const seen = new Set<string>();
  let duplicateNomInCsv = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = cellsToParsedRow(cells);
    if (!row) continue;
    const k = normalizeClubKey(row.nom);
    if (seen.has(k)) duplicateNomInCsv++;
    seen.add(k);
  }

  const rows = Array.from(byKey.values()).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return { ok: true, rows, duplicateNomInCsv, linesSkipped };
}

const FIELD_LABELS: Record<string, string> = {
  format: "Format",
  president_nom: "Président",
  agence_rattachement: "Agence de rattachement",
  agence_mere: "Agence mère",
  telephone_president: "Téléphone",
  email_president: "E-mail",
  adresse: "Adresse",
  departement: "Département",
  statut: "Statut",
  nb_membres_actifs: "Membres actifs",
  nb_leads_transformes: "Leads transformés",
  montant_ca: "CA (€)",
  date_creation: "Date de création",
  date_desactivation: "Date de désactivation",
};

function fmtVal(key: string, v: string | number | null): string {
  if (v === null || v === undefined) return "—";
  if (key === "montant_ca" && typeof v === "number") {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v);
  }
  if ((key === "nb_membres_actifs" || key === "nb_leads_transformes") && typeof v === "number") {
    return String(v);
  }
  if ((key === "date_creation" || key === "date_desactivation") && typeof v === "string") {
    if (!v) return "—";
    const [y, m, d] = v.split("-");
    return d && m && y ? `${d}/${m}/${y}` : v;
  }
  return String(v);
}

export type ClubLike = {
  nom: string;
  format: string;
  president_nom: string;
  agence_rattachement: string | null;
  agence_mere: string | null;
  telephone_president: string | null;
  email_president: string | null;
  adresse: string | null;
  departement: string | null;
  statut: string;
  nb_membres_actifs: number;
  nb_leads_transformes: number;
  montant_ca: number;
  date_creation: string | null;
  date_desactivation: string | null;
};

const COMPARE_KEYS: (keyof ParsedClubRow)[] = [
  "format",
  "president_nom",
  "agence_rattachement",
  "agence_mere",
  "telephone_president",
  "email_president",
  "adresse",
  "departement",
  "statut",
  "nb_membres_actifs",
  "nb_leads_transformes",
  "montant_ca",
  "date_creation",
  "date_desactivation",
];

function valuesEqual(key: keyof ParsedClubRow, a: ParsedClubRow, b: ClubLike): boolean {
  const av = a[key];
  const bv = b[key as keyof ClubLike];
  if (key === "montant_ca") {
    return Math.abs((av as number) - (bv as number)) < 0.005;
  }
  if (key === "nb_membres_actifs" || key === "nb_leads_transformes") {
    return Number(av) === Number(bv);
  }
  const as = av === null || av === undefined ? "" : String(av).trim();
  const bs = bv === null || bv === undefined ? "" : String(bv).trim();
  return as === bs;
}

export function diffClub(csv: ParsedClubRow, existing: ClubLike): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of COMPARE_KEYS) {
    if (valuesEqual(key, csv, existing)) continue;
    const label = FIELD_LABELS[key] ?? key;
    changes.push({
      key,
      label,
      before: fmtVal(key, existing[key as keyof ClubLike] as never),
      after: fmtVal(key, csv[key] as never),
    });
  }
  return changes;
}

export function labelForFieldKey(key: string): string {
  return FIELD_LABELS[key] ?? key;
}
