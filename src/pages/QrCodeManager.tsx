import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { publicAssetUrl } from "@/lib/basePath";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faPen, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

type QrRecord = {
  id: string;
  name: string;
  value: string;
  size: number;
  fgColor: string;
  bgColor: string;
  level: "L" | "M" | "Q" | "H";
  logoUrl?: string;
  eyeSvg?: string;
  dotSvg?: string;
  coverSvg?: string;
};

const STORAGE_KEY = "dynaperf_qrcodes_v1";

const EYE_PRESETS: { id: string; svg: string }[] = [
  { id: "0", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0v14h14V0H0z M12,12H2V2h10V12z"></path></svg>' },
  { id: "2", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0.9,13c0,0.6,0.5,1,1,1h12V2c0-0.6-0.4-1-1-1L0,0z M12,12H3.8c-0.5,0-1-0.4-1-1L2,2l9,0.7c0.5,0,1,0.5,1,1 V12z"></path></svg>' },
  { id: "3", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,7c0,3.9,3.1,7,7,7h0c3.9,0,7-3.1,7-7v0c0-3.9-3.1-7-7-7H0z M7,12L7,12c-2.8,0-5-2.2-5-5V2h5c2.8,0,5,2.2,5,5v0 C12,9.8,9.8,12,7,12z"></path></svg>' },
  { id: "4", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,7L0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7h0C3.1,0,0,3.1,0,7z M12,12H7c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0 c2.8,0,5,2.2,5,5V12z"></path></svg>' },
  { id: "5", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M12,12H7c-2.8,0-5-2.2-5-5V2h5c2.8,0,5,2.2,5,5V12z"></path></svg>' },
  { id: "6", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M12,12H7c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5V12z"></path></svg>' },
  { id: "7", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M7,12L7,12c-2.8,0-5-2.2-5-5V2h5c2.8,0,5,2.2,5,5v0C12,9.8,9.8,12,7,12z"></path></svg>' },
  { id: "8", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,7c0,3.9,3.1,7,7,7h7V7c0-3.9-3.1-7-7-7H0z M7,12L7,12c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5v0 C12,9.8,9.8,12,7,12z"></path></svg>' },
  { id: "9", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0l0,14h14V0H0z M7,12L7,12c-2.8,0-5-2.2-5-5v0c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5v0C12,9.8,9.8,12,7,12z"></path></svg>' },
  { id: "10", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,7L0,7c0,3.9,3.1,7,7,7h0c3.9,0,7-3.1,7-7v0c0-3.9-3.1-7-7-7h0C3.1,0,0,3.1,0,7z M7,12L7,12c-2.8,0-5-2.2-5-5v0 c0-2.8,2.2-5,5-5h0c2.8,0,5,2.2,5,5v0C12,9.8,9.8,12,7,12z"></path></svg>' },
  { id: "11", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.5,14h5.1C12,14,14,12,14,9.6V4.5C14,2,12,0,9.5,0H4.4C2,0,0,2,0,4.4v5.1C0,12,2,14,4.5,14z M12,4.8v4.4 c0,1.5-1.3,2.8-2.8,2.8H4.8C3.2,12,2,10.8,2,9.2V4.8C2,3.3,3.3,2,4.8,2h4.4C10.8,2,12,3.2,12,4.8z"></path></svg>' },
  { id: "12", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0v9.6C0,12,2,14,4.4,14h5.1C12,14,14,12,14,9.6V4.4C14,2,12,0,9.6,0H0z M9.2,12H4.8C3.3,12,2,10.7,2,9.2V2h7.2 C10.7,2,12,3.3,12,4.8v4.4C12,10.7,10.7,12,9.2,12z"></path></svg>' },
  { id: "13", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M14,14V4.4C14,2,12,0,9.6,0H4.4C2,0,0,2,0,4.4v5.1C0,12,2,14,4.4,14H14z M4.8,2h4.4C10.7,2,12,3.3,12,4.8V12H4.8 C3.3,12,2,10.7,2,9.2V4.8C2,3.3,3.3,2,4.8,2z"></path></svg>' },
  { id: "14", svg: '<svg width="32" height="32" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M0,0v9.6C0,12,2,14,4.4,14H14V4.4C14,2,12,0,9.6,0H0z M12,12H4.8C3.3,12,2,10.7,2,9.2V2h7.2C10.7,2,12,3.3,12,4.8V12z"></path></svg>' },
];

function loadRecords(): QrRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QrRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecords(records: QrRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function makeEmpty(): QrRecord {
  return {
    id: crypto.randomUUID(),
    name: "",
    value: "",
    size: 220,
    fgColor: "#111827",
    bgColor: "#ffffff",
    level: "M",
    logoUrl: "",
    eyeSvg: "",
    dotSvg: "",
    coverSvg: "",
  };
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function SvgLayer({
  svg,
  color,
  size,
  style,
}: {
  svg?: string;
  color: string;
  size: number;
  style: React.CSSProperties;
}) {
  if (!svg) return null;
  return (
    <div
      className="pointer-events-none absolute"
      style={{ width: size, height: size, color, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
      aria-hidden
    />
  );
}

function QrPreview({ record }: { record: QrRecord }) {
  const eye = Math.max(22, Math.floor(record.size * 0.2));
  const dot = Math.max(8, Math.floor(eye * 0.36));
  const cover = Math.max(18, Math.floor(record.size * 0.24));
  const logo = Math.max(26, Math.floor(record.size * 0.18));
  const offset = 8;
  const centerOffset = Math.floor((eye - dot) / 2);
  const right = offset + record.size - eye;
  const bottom = offset + record.size - eye;

  return (
    <div className="relative mx-auto w-fit rounded-lg bg-white p-2">
      <QRCodeSVG
        value={record.value || " "}
        size={record.size}
        level={record.level}
        fgColor={record.fgColor}
        bgColor={record.bgColor}
        imageSettings={
          record.logoUrl
            ? {
                src: record.logoUrl.startsWith("/") ? publicAssetUrl(record.logoUrl.replace(/^\//, "")) : record.logoUrl,
                height: logo,
                width: logo,
                excavate: true,
              }
            : undefined
        }
      />
      <SvgLayer svg={record.eyeSvg} color={record.fgColor} size={eye} style={{ left: offset, top: offset }} />
      <SvgLayer svg={record.eyeSvg} color={record.fgColor} size={eye} style={{ left: right, top: offset }} />
      <SvgLayer svg={record.eyeSvg} color={record.fgColor} size={eye} style={{ left: offset, top: bottom }} />
      <SvgLayer svg={record.dotSvg} color={record.fgColor} size={dot} style={{ left: offset + centerOffset, top: offset + centerOffset }} />
      <SvgLayer svg={record.dotSvg} color={record.fgColor} size={dot} style={{ left: right + centerOffset, top: offset + centerOffset }} />
      <SvgLayer svg={record.dotSvg} color={record.fgColor} size={dot} style={{ left: offset + centerOffset, top: bottom + centerOffset }} />
      <SvgLayer
        svg={record.coverSvg}
        color={record.fgColor}
        size={cover}
        style={{ left: offset + Math.floor((record.size - cover) / 2), top: offset + Math.floor((record.size - cover) / 2) }}
      />
    </div>
  );
}

export default function QrCodeManager() {
  const [records, setRecords] = useState<QrRecord[]>(() => loadRecords());
  const [draft, setDraft] = useState<QrRecord>(() => makeEmpty());
  const [editingId, setEditingId] = useState<string | null>(null);

  const sorted = useMemo(() => [...records].sort((a, b) => a.name.localeCompare(b.name, "fr")), [records]);

  const persist = (next: QrRecord[]) => {
    setRecords(next);
    saveRecords(next);
  };

  const resetDraft = () => {
    setDraft(makeEmpty());
    setEditingId(null);
  };

  const submit = () => {
    if (!draft.name.trim() || !draft.value.trim()) {
      toast.error("Nom et lien/texte sont requis.");
      return;
    }
    const payload: QrRecord = { ...draft, name: draft.name.trim(), value: draft.value.trim() };
    if (editingId) {
      persist(records.map((r) => (r.id === editingId ? payload : r)));
      toast.success("QrCode modifie.");
    } else {
      persist([payload, ...records]);
      toast.success("QrCode cree.");
    }
    resetDraft();
  };

  const uploadSvg = async (file: File | undefined, key: "eyeSvg" | "dotSvg" | "coverSvg") => {
    if (!file) return;
    try {
      const svg = await readFileAsText(file);
      if (!svg.includes("<svg")) {
        toast.error("Fichier SVG invalide.");
        return;
      }
      setDraft((p) => ({ ...p, [key]: svg }));
    } catch {
      toast.error("Import SVG impossible.");
    }
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setDraft((p) => ({ ...p, logoUrl: dataUrl }));
    } catch {
      toast.error("Import logo impossible.");
    }
  };

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestion QrCode</h1>
          <p className="text-sm text-muted-foreground">Genere, personnalise et gere un nombre illimite de QR codes.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="space-y-3 rounded-2xl border border-border/40 bg-card p-4">
            <div className="space-y-1">
              <Label>Nom</Label>
              <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: WelcomeApps" />
            </div>
            <div className="space-y-1">
              <Label>Lien / texte</Label>
              <Input value={draft.value} onChange={(e) => setDraft((p) => ({ ...p, value: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Couleur QR</Label>
                <Input type="color" value={draft.fgColor} onChange={(e) => setDraft((p) => ({ ...p, fgColor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fond</Label>
                <Input type="color" value={draft.bgColor} onChange={(e) => setDraft((p) => ({ ...p, bgColor: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Taille</Label>
                <Input type="number" min={120} max={600} value={draft.size} onChange={(e) => setDraft((p) => ({ ...p, size: Number(e.target.value || 220) }))} />
              </div>
              <div className="space-y-1">
                <Label>Niveau</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.level}
                  onChange={(e) => setDraft((p) => ({ ...p, level: e.target.value as QrRecord["level"] }))}
                >
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="Q">Q</option>
                  <option value="H">H</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Logo central (URL ou upload)</Label>
              <Input value={draft.logoUrl || ""} onChange={(e) => setDraft((p) => ({ ...p, logoUrl: e.target.value }))} placeholder="URL image/logo" />
              <Input type="file" accept="image/*" onChange={(e) => void uploadLogo(e.target.files?.[0])} />
            </div>
            <div className="space-y-1">
              <Label>Eyes SVG (tes presets fournis)</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={draft.eyeSvg || ""}
                onChange={(e) => setDraft((p) => ({ ...p, eyeSvg: e.target.value }))}
              >
                <option value="">Aucun</option>
                {EYE_PRESETS.map((p) => (
                  <option key={p.id} value={p.svg}>Eyes #{p.id}</option>
                ))}
              </select>
              <Input type="file" accept=".svg,image/svg+xml" onChange={(e) => void uploadSvg(e.target.files?.[0], "eyeSvg")} />
            </div>
            <div className="space-y-1">
              <Label>Dot SVG (upload)</Label>
              <Input type="file" accept=".svg,image/svg+xml" onChange={(e) => void uploadSvg(e.target.files?.[0], "dotSvg")} />
            </div>
            <div className="space-y-1">
              <Label>Cover SVG (upload)</Label>
              <Input type="file" accept=".svg,image/svg+xml" onChange={(e) => void uploadSvg(e.target.files?.[0], "coverSvg")} />
            </div>
            <div className="rounded-xl border border-border/40 p-2">
              <p className="mb-2 text-xs text-muted-foreground">Apercu en direct</p>
              <QrPreview record={draft} />
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} className="gap-2">
                <FontAwesomeIcon icon={editingId ? faFloppyDisk : faPlus} className="h-3.5 w-3.5" />
                {editingId ? "Enregistrer" : "Creer"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetDraft}>Annuler</Button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-4">
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun QR code pour le moment.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.map((r) => (
                  <div key={r.id} className="space-y-2 rounded-xl border border-border/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(r.id);
                            setDraft(r);
                          }}
                        >
                          <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => persist(records.filter((x) => x.id !== r.id))}
                        >
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <QrPreview record={r} />
                    <p className="break-all text-xs text-muted-foreground">{r.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}

