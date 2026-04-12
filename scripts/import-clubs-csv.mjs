/**
 * Lit un export CSV (séparateur ;) et génère un fichier SQL pour public.clubs.
 * Usage: node scripts/import-clubs-csv.mjs <chemin.csv> [sortie.sql]
 */
import fs from "fs";
import path from "path";

function parseCsvLine(line) {
  const out = [];
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

function parseFrDate(s) {
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

function parseAmount(raw) {
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

function parseIntSafe(s) {
  const n = parseInt(String(s).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function mapStatut(csv) {
  const t = String(csv || "").trim();
  if (t === "Actif") return "Actif";
  if (t === "Inactif") return "Désactivé";
  if (t === "Annulé") return "Archivé";
  return "Actif";
}

function escSql(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

const csvPath = process.argv[2];
const outPath =
  process.argv[3] || path.join("supabase", "migrations", "20260412120005_seed_clubs_from_csv.sql");

if (!csvPath || !fs.existsSync(csvPath)) {
  console.error("Usage: node scripts/import-clubs-csv.mjs <fichier.csv> [sortie.sql]");
  process.exit(1);
}

/** Décode le fichier : UTF-8 avec BOM si présent, sinon Windows-1252 (exports Excel FR). */
function readCsvText(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  return new TextDecoder("windows-1252").decode(buf);
}

const raw = readCsvText(csvPath);
const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
if (lines.length < 2) {
  console.error("CSV vide");
  process.exit(1);
}

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const cells = parseCsvLine(lines[i]);
  if (cells.length < 10) continue;
  rows.push(cells);
}

function valDate(d) {
  if (!d) return "NULL";
  return `${escSql(d)}::date`;
}

const valueRows = [];
for (const c of rows) {
  const nom = c[0]?.trim();
  if (!nom) continue;
  const format = c[1]?.trim() || "Développement";
  const president = c[2]?.trim() || "";
  const agR = c[3]?.trim() || null;
  const agM = c[4]?.trim() || null;
  const tel = c[5]?.trim() || null;
  const mail = c[6]?.trim() || null;
  const adr = c[7]?.trim() || null;
  const dept = c[8]?.trim() || null;
  const statut = mapStatut(c[9]);
  const membres = parseIntSafe(c[10]);
  const leads = parseIntSafe(c[11]);
  const ca = parseAmount(c[12]);
  const dcre = parseFrDate(c[13]);
  const ddes = parseFrDate(c[14]);

  const o = (x) => (x ? escSql(x) : "NULL");
  valueRows.push(
    `(${escSql(nom)}, ${escSql(format)}, ${escSql(president)}, NULL, ${o(agR)}, ${o(agM)}, ${o(tel)}, NULL, ${o(mail)}, ${o(adr)}, ${o(dept)}, ${escSql(statut)}, ${membres}, ${leads}, ${ca}, ${valDate(dcre)}, ${valDate(ddes)})`,
  );
}

const sql = `-- Seed clubs depuis export CSV (idempotent sur le nom)
-- Généré par: node scripts/import-clubs-csv.mjs

INSERT INTO public.clubs (
  nom, format, president_nom, vice_president_nom,
  agence_rattachement, agence_mere, telephone_president, telephone_vice_president,
  email_president, adresse, departement, statut,
  nb_membres_actifs, nb_leads_transformes, montant_ca,
  date_creation, date_desactivation
)
SELECT v.nom::text, v.format::text, v.president_nom::text, v.vice_president_nom::text,
  v.agence_rattachement::text, v.agence_mere::text, v.telephone_president::text, v.telephone_vice_president::text,
  v.email_president::text, v.adresse::text, v.departement::text, v.statut::text,
  v.nb_membres_actifs::integer, v.nb_leads_transformes::integer, v.montant_ca::numeric,
  v.date_creation::date, v.date_desactivation::date
FROM (VALUES
${valueRows.join(",\n")}
) AS v(
  nom, format, president_nom, vice_president_nom,
  agence_rattachement, agence_mere, telephone_president, telephone_vice_president,
  email_president, adresse, departement, statut,
  nb_membres_actifs, nb_leads_transformes, montant_ca,
  date_creation, date_desactivation
)
WHERE NOT EXISTS (SELECT 1 FROM public.clubs c WHERE c.nom = v.nom);
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sql, "utf8");
console.log(`Écrit ${valueRows.length} lignes -> ${outPath}`);
