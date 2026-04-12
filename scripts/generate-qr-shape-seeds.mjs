/**
 * Génère les UUID déterministes + le SQL d'INSERT pour `qr_shape_library`
 * et le fichier `src/lib/qrShapeDefaults.generated.ts`.
 *
 * Usage : node scripts/generate-qr-shape-seeds.mjs
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function uuidFromKey(kind, legacyKey) {
  const h = crypto.createHash("sha256").update(`${kind}:${legacyKey}`).digest();
  const b = Buffer.from(h.subarray(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

function readSvg(relPath) {
  return fs.readFileSync(path.join(root, "public", relPath), "utf8");
}

const kinds = {
  dots: { kind: "dot", prefix: "dot", folder: "qrcode/dots" },
  corners: { kind: "corner", prefix: "corner", folder: "qrcode/corners" },
  covers: { kind: "cover", prefix: "cover", folder: "qrcode/covers" },
};

const rows = [];
const legacyMap = {};

for (const meta of Object.values(kinds)) {
  const dir = path.join(root, "public", meta.folder);
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".svg"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const file of files) {
    const idx = file.replace(/\.svg$/i, "");
    const legacyKey = `${meta.prefix}:${idx}`;
    const id = uuidFromKey(meta.kind, legacyKey);
    const svg = readSvg(`${meta.folder}/${file}`);
    const name =
      meta.kind === "dot" ? `Module ${idx}` : meta.kind === "corner" ? `Repère ${idx}` : `Voile ${idx}`;
    const sortOrder = Number.parseInt(idx, 10);
    rows.push({
      id,
      kind: meta.kind,
      name,
      svg_markup: svg,
      legacy_key: legacyKey,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    });
    legacyMap[legacyKey] = id;
  }
}

const dotShapeId = legacyMap["dot:7"];
const cornerOuterShapeId = legacyMap["corner:3"];
const cornerInnerShapeId = legacyMap["dot:6"];
const coverShapeId = legacyMap["cover:0"] ?? null;

const mapEntries = Object.entries(legacyMap)
  .map(([k, v]) => `  ${JSON.stringify(k)}: "${v}",`)
  .join("\n");

const tsOut = `/**
 * Généré par \`node scripts/generate-qr-shape-seeds.mjs\` — ne pas éditer à la main.
 */
export const QR_DEFAULT_DOT_SHAPE_ID = "${dotShapeId}";
export const QR_DEFAULT_CORNER_OUTER_SHAPE_ID = "${cornerOuterShapeId}";
export const QR_DEFAULT_CORNER_INNER_SHAPE_ID = "${cornerInnerShapeId}";
export const QR_DEFAULT_COVER_SHAPE_ID: string | null = ${coverShapeId ? `"${coverShapeId}"` : "null"};

/** Correspondance \`legacy_key\` → \`id\` (alignée sur la migration SQL). */
export const QR_LEGACY_SHAPE_ID_BY_KEY: Record<string, string> = {
${mapEntries}
};
`;

fs.writeFileSync(path.join(root, "src/lib/qrShapeDefaults.generated.ts"), tsOut, "utf8");

const sqlValues = rows
  .map((r) => {
    const tag = `s${r.id.replace(/-/g, "")}`;
    return `  ('${r.id}', '${r.kind}'::public.qr_shape_kind, '${sqlEscape(r.name)}', $${tag}$${r.svg_markup}$${tag}$, '${sqlEscape(r.legacy_key)}', ${r.sort_order}, true)`;
  })
  .join(",\n");

const sqlOut = `-- Fragment généré (données) — inclus par la migration
INSERT INTO public.qr_shape_library (id, kind, name, svg_markup, legacy_key, sort_order, is_active)
VALUES
${sqlValues}
ON CONFLICT (id) DO NOTHING;
`;

fs.writeFileSync(path.join(root, "supabase/migrations/20260430120000_qr_shape_library_data.sql"), sqlOut, "utf8");

console.log("Wrote src/lib/qrShapeDefaults.generated.ts");
console.log("Wrote supabase/migrations/20260430120000_qr_shape_library_data.sql");
console.log(`Rows: ${rows.length}`);
