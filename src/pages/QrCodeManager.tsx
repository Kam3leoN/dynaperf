import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignLeft,
  faCreditCard,
  faEnvelope,
  faFloppyDisk,
  faIdCard,
  faLink,
  faPen,
  faPhone,
  faPlus,
  faQrcode,
  faSms,
  faTrash,
  faWifi,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { faPaypal, faStripe, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { toast } from "sonner";
import defaultLogoDynaLipsRed from "@/assets/logo-dynalips-red.svg";
import { QrStylingPreview } from "@/components/qr/QrStylingPreview";
import { QrFgColorSwatches } from "@/components/qr/QrFgColorSwatches";
import { QrStyleVisualPickers } from "@/components/qr/QrStyleSwatches";
import { DEFAULT_QR_STYLE, mergeQrStyle, type QrStyleConfig } from "@/lib/qrCodeStyle";
import { isTransparentBgColor } from "@/lib/qrBgColor";
import { composeQrPayload, type QrComposeFields, type QrContentKind } from "@/lib/qrContentCompose";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/utils";

type QrRecord = {
  id: string;
  name: string;
  value: string;
  size: number;
  fgColor: string;
  bgColor: string;
  level: "L" | "M" | "Q" | "H";
  logoUrl?: string;
  qrStyle: QrStyleConfig;
};

type LogoGalleryItem = { id: string; dataUrl: string };

const LOGO_GALLERY_KEY = "dynaperf_qr_logo_gallery_v2";

const PREVIEW_MAX = 320;

function isBundledDefaultLogo(url: string | undefined): boolean {
  if (!url) return false;
  return url === defaultLogoDynaLipsRed || url.includes("logo-dynalips-red");
}

type PresetCard = {
  kind: QrContentKind;
  title: string;
  description: string;
  icon: IconDefinition;
  accent: string;
};

const CONTENT_PRESETS: PresetCard[] = [
  { kind: "url", title: "Lien", description: "Site web", icon: faLink, accent: "text-emerald-600" },
  { kind: "email", title: "E-mail", description: "Envoyer un e-mail", icon: faEnvelope, accent: "text-sky-600" },
  { kind: "text", title: "Texte", description: "Texte brut", icon: faAlignLeft, accent: "text-amber-600" },
  { kind: "tel", title: "Appel", description: "Numéro à appeler", icon: faPhone, accent: "text-emerald-700" },
  { kind: "sms", title: "SMS", description: "SMS", icon: faSms, accent: "text-blue-600" },
  { kind: "whatsapp", title: "WhatsApp", description: "Message WA", icon: faWhatsapp, accent: "text-green-600" },
  { kind: "wifi", title: "Wi‑Fi", description: "Connexion Wi‑Fi", icon: faWifi, accent: "text-teal-600" },
  { kind: "vcard", title: "Vcard", description: "Contact", icon: faIdCard, accent: "text-indigo-600" },
  { kind: "paypal", title: "PayPal", description: "PayPal.me", icon: faPaypal, accent: "text-blue-700" },
  { kind: "stripe", title: "Stripe", description: "Lien Stripe", icon: faStripe, accent: "text-violet-600" },
  {
    kind: "payment_url",
    title: "Paiement",
    description: "URL de paiement",
    icon: faCreditCard,
    accent: "text-orange-600",
  },
  { kind: "custom", title: "Libre", description: "Coller une chaîne", icon: faQrcode, accent: "text-slate-600" },
];

function makeEmpty(): QrRecord {
  return {
    id: crypto.randomUUID(),
    name: "",
    value: "https://",
    size: 512,
    fgColor: "#111827",
    bgColor: "#ffffff",
    level: "H",
    logoUrl: defaultLogoDynaLipsRed,
    qrStyle: { ...DEFAULT_QR_STYLE },
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadGallery(): LogoGalleryItem[] {
  try {
    const raw = localStorage.getItem(LOGO_GALLERY_KEY);
    const parsed = raw ? (JSON.parse(raw) as LogoGalleryItem[]) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => x?.id && x?.dataUrl) : [];
  } catch {
    return [];
  }
}

function ContentFields({
  kind,
  fields,
  onChange,
  valueCustom,
  onValueCustom,
}: {
  kind: QrContentKind;
  fields: QrComposeFields;
  onChange: (p: Partial<QrComposeFields>) => void;
  valueCustom: string;
  onValueCustom: (v: string) => void;
}) {
  if (kind === "custom") {
    return (
      <div className="space-y-1">
        <Label>Contenu encodé</Label>
        <textarea
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={valueCustom}
          onChange={(e) => onValueCustom(e.target.value)}
          placeholder="https://… ou texte brut"
        />
      </div>
    );
  }

  if (kind === "url") {
    return (
      <div className="space-y-1">
        <Label>URL</Label>
        <Input value={fields.url ?? ""} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://exemple.fr" />
      </div>
    );
  }

  if (kind === "email") {
    return (
      <div className="grid gap-2">
        <div className="space-y-1">
          <Label>E-mail</Label>
          <Input type="email" value={fields.email ?? ""} onChange={(e) => onChange({ email: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Objet (optionnel)</Label>
          <Input value={fields.emailSubject ?? ""} onChange={(e) => onChange({ emailSubject: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Message (optionnel)</Label>
          <Input value={fields.emailBody ?? ""} onChange={(e) => onChange({ emailBody: e.target.value })} />
        </div>
      </div>
    );
  }

  if (kind === "text") {
    return (
      <div className="space-y-1">
        <Label>Texte</Label>
        <textarea
          className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={fields.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
    );
  }

  if (kind === "tel" || kind === "sms" || kind === "whatsapp") {
    return (
      <div className="grid gap-2">
        <div className="space-y-1">
          <Label>Numéro (indicatif inclus, ex. +33612345678)</Label>
          <Input value={fields.phone ?? ""} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+33…" />
        </div>
        {kind === "sms" && (
          <div className="space-y-1">
            <Label>Message (optionnel)</Label>
            <Input value={fields.smsBody ?? ""} onChange={(e) => onChange({ smsBody: e.target.value })} />
          </div>
        )}
        {kind === "whatsapp" && (
          <div className="space-y-1">
            <Label>Message prérempli (optionnel)</Label>
            <Input value={fields.waText ?? ""} onChange={(e) => onChange({ waText: e.target.value })} />
          </div>
        )}
      </div>
    );
  }

  if (kind === "wifi") {
    return (
      <div className="grid gap-2">
        <div className="space-y-1">
          <Label>Nom du réseau (SSID)</Label>
          <Input value={fields.wifiSsid ?? ""} onChange={(e) => onChange({ wifiSsid: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Mot de passe</Label>
          <Input type="password" value={fields.wifiPass ?? ""} onChange={(e) => onChange({ wifiPass: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Sécurité</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={fields.wifiEnc ?? "WPA"}
            onChange={(e) => onChange({ wifiEnc: e.target.value as QrComposeFields["wifiEnc"] })}
          >
            <option value="WPA">WPA / WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">Ouvert</option>
          </select>
        </div>
      </div>
    );
  }

  if (kind === "vcard") {
    return (
      <div className="grid gap-2">
        <div className="space-y-1">
          <Label>Nom</Label>
          <Input value={fields.vcardName ?? ""} onChange={(e) => onChange({ vcardName: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Téléphone</Label>
          <Input value={fields.vcardTel ?? ""} onChange={(e) => onChange({ vcardTel: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>E-mail</Label>
          <Input value={fields.vcardEmail ?? ""} onChange={(e) => onChange({ vcardEmail: e.target.value })} />
        </div>
      </div>
    );
  }

  if (kind === "paypal") {
    return (
      <div className="space-y-1">
        <Label>PayPal.me (pseudo) ou URL complète</Label>
        <Input value={fields.paypalSlug ?? ""} onChange={(e) => onChange({ paypalSlug: e.target.value })} placeholder="votre-compte ou https://…" />
      </div>
    );
  }

  if (kind === "stripe") {
    return (
      <div className="space-y-1">
        <Label>Lien de paiement Stripe</Label>
        <Input value={fields.stripeUrl ?? ""} onChange={(e) => onChange({ stripeUrl: e.target.value })} placeholder="https://buy.stripe.com/…" />
      </div>
    );
  }

  if (kind === "payment_url") {
    return (
      <div className="space-y-1">
        <Label>URL de paiement</Label>
        <Input value={fields.paymentUrl ?? ""} onChange={(e) => onChange({ paymentUrl: e.target.value })} placeholder="Lydia, SumUp, boutique…" />
      </div>
    );
  }

  return null;
}

export default function QrCodeManager() {
  const [records, setRecords] = useState<QrRecord[]>([]);
  const [draft, setDraft] = useState<QrRecord>(() => makeEmpty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [composeKind, setComposeKind] = useState<QrContentKind>("url");
  const [composeFields, setComposeFields] = useState<QrComposeFields>({});
  const [useDefaultLogo, setUseDefaultLogo] = useState(true);
  const [logoGallery, setLogoGallery] = useState<LogoGalleryItem[]>(() => loadGallery());

  const sorted = useMemo(() => [...records].sort((a, b) => a.name.localeCompare(b.name, "fr")), [records]);

  const effectiveLogoUrl = useMemo(() => {
    if (useDefaultLogo) return defaultLogoDynaLipsRed;
    const u = (draft.logoUrl || "").trim();
    return u || undefined;
  }, [useDefaultLogo, draft.logoUrl]);

  useEffect(() => {
    localStorage.setItem(LOGO_GALLERY_KEY, JSON.stringify(logoGallery));
  }, [logoGallery]);

  useEffect(() => {
    if (composeKind === "custom") return;
    const next = composeQrPayload(composeKind, composeFields);
    setDraft((d) => ({ ...d, value: next }));
  }, [composeKind, composeFields]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("qr_codes").select("*").order("created_at", { ascending: false });
      if (error) {
        toast.error(`QR codes: ${error.message}`);
        if (alive) setLoading(false);
        return;
      }
      if (!alive) return;
      setRecords(
        (data ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          value: r.value,
          size: r.size,
          fgColor: r.fg_color,
          bgColor: r.bg_color,
          level: (r.level as QrRecord["level"]) || "H",
          logoUrl: r.logo_url ?? "",
          qrStyle: mergeQrStyle(r.qr_style),
        })),
      );
      setLoading(false);
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const persistDelete = async (id: string) => {
    const { error } = await supabase.from("qr_codes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRecords((prev) => prev.filter((x) => x.id !== id));
  };

  const resetDraft = () => {
    setDraft(makeEmpty());
    setEditingId(null);
    setComposeKind("url");
    setComposeFields({});
    setUseDefaultLogo(true);
  };

  const validatePayload = (value: string): boolean => {
    const v = value.trim();
    if (!v) return false;
    if (v === "https://" || v === "http://") return false;
    return true;
  };

  const submit = async () => {
    if (!draft.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    if (!validatePayload(draft.value)) {
      toast.error("Contenu du QR invalide ou vide.");
      return;
    }
    const logoPersist = useDefaultLogo ? defaultLogoDynaLipsRed : (draft.logoUrl || "").trim() || null;
    const payload: QrRecord = {
      ...draft,
      name: draft.name.trim(),
      value: draft.value.trim(),
      logoUrl: logoPersist ?? "",
    };

    if (editingId) {
      const { error } = await supabase
        .from("qr_codes")
        .update({
          name: payload.name,
          value: payload.value,
          size: payload.size,
          fg_color: payload.fgColor,
          bg_color: payload.bgColor,
          level: payload.level,
          logo_url: logoPersist,
          qr_style: payload.qrStyle,
          eye_svg: null,
          dot_svg: null,
          cover_svg: null,
        })
        .eq("id", editingId);
      if (error) {
        toast.error(error.message);
        return;
      }
      setRecords((prev) => prev.map((r) => (r.id === editingId ? payload : r)));
      toast.success("QrCode modifié.");
    } else {
      const { data, error } = await supabase
        .from("qr_codes")
        .insert({
          name: payload.name,
          value: payload.value,
          size: payload.size,
          fg_color: payload.fgColor,
          bg_color: payload.bgColor,
          level: payload.level,
          logo_url: logoPersist,
          qr_style: payload.qrStyle,
          eye_svg: null,
          dot_svg: null,
          cover_svg: null,
        })
        .select("*")
        .single();
      if (error || !data) {
        toast.error(error?.message || "Création impossible");
        return;
      }
      setRecords((prev) => [
        {
          id: data.id,
          name: data.name,
          value: data.value,
          size: data.size,
          fgColor: data.fg_color,
          bgColor: data.bg_color,
          level: (data.level as QrRecord["level"]) || "H",
          logoUrl: data.logo_url ?? "",
          qrStyle: mergeQrStyle(data.qr_style),
        },
        ...prev,
      ]);
      toast.success("QrCode créé.");
    }
    resetDraft();
  };

  const addFilesToGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: LogoGalleryItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) continue;
      try {
        const dataUrl = await readFileAsDataUrl(f);
        next.push({ id: crypto.randomUUID(), dataUrl });
      } catch {
        toast.error(`Impossible de lire ${f.name}`);
      }
    }
    if (next.length === 0) return;
    setLogoGallery((prev) => [...next, ...prev]);
    setUseDefaultLogo(false);
    setDraft((d) => ({ ...d, logoUrl: next[0].dataUrl }));
    toast.success(next.length > 1 ? `${next.length} logos ajoutés` : "Logo ajouté à la bibliothèque");
  };

  const removeGalleryItem = (id: string) => {
    setLogoGallery((prev) => {
      const item = prev.find((x) => x.id === id);
      if (!item) return prev;
      const rest = prev.filter((x) => x.id !== id);
      setDraft((d) => {
        if (useDefaultLogo || d.logoUrl !== item.dataUrl) return d;
        const next = rest[0]?.dataUrl;
        if (!next) {
          setTimeout(() => setUseDefaultLogo(true), 0);
          return { ...d, logoUrl: defaultLogoDynaLipsRed };
        }
        return { ...d, logoUrl: next };
      });
      return rest;
    });
  };

  const pickPreset = (kind: QrContentKind) => {
    setComposeKind(kind);
    setComposeFields({});
    if (kind === "custom") {
      setDraft((d) => ({ ...d, value: "" }));
    }
  };

  const startEdit = (r: QrRecord) => {
    setEditingId(r.id);
    setComposeKind("custom");
    setComposeFields({});
    const def = isBundledDefaultLogo(r.logoUrl) || !r.logoUrl?.trim();
    setUseDefaultLogo(def);
    setDraft({
      ...r,
      logoUrl: def ? defaultLogoDynaLipsRed : (r.logoUrl || ""),
      level: r.level || "H",
      size: r.size || 512,
    });
  };

  const previewSize = Math.min(PREVIEW_MAX, Math.max(160, draft.size));

  return (
    <AppLayout>
      <section className="app-page-shell-wide min-w-0 w-full space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-semibold">Gestion QrCode</h1>
          <p className="text-sm text-muted-foreground">
            Contenu à gauche, aperçu à droite, bibliothèque et liste enregistrée en dessous — personnalisation visuelle (SVG, pastilles de couleur).
          </p>
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_min(360px,34%)] xl:items-start">
          {/* Colonne édition */}
          <div className="min-w-0 space-y-4 rounded-2xl border border-border/40 bg-card p-4 sm:p-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Type de contenu</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {CONTENT_PRESETS.map((p) => (
                  <button
                    key={p.kind}
                    type="button"
                    onClick={() => pickPreset(p.kind)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border bg-background p-2.5 text-center transition hover:bg-muted/50",
                      composeKind === p.kind ? "border-primary ring-1 ring-primary/30" : "border-border/60",
                    )}
                  >
                    <FontAwesomeIcon icon={p.icon} className={cn("h-6 w-6", p.accent)} />
                    <span className="text-xs font-semibold leading-tight">{p.title}</span>
                    <span className="line-clamp-2 text-[10px] text-muted-foreground">{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Nom</Label>
              <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Flyer printemps" />
            </div>

            <ContentFields
              kind={composeKind}
              fields={composeFields}
              onChange={(patch) => setComposeFields((f) => ({ ...f, ...patch }))}
              valueCustom={draft.value}
              onValueCustom={(v) => setDraft((d) => ({ ...d, value: v }))}
            />

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Couleur modules</Label>
                <QrFgColorSwatches
                  value={draft.fgColor}
                  onChange={(hex) => setDraft((p) => ({ ...p, fgColor: hex }))}
                />
                <Input
                  type="color"
                  className="h-10 max-w-[120px] cursor-pointer"
                  value={draft.fgColor}
                  onChange={(e) => setDraft((p) => ({ ...p, fgColor: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Fond</Label>
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="rounded border-input"
                        checked={isTransparentBgColor(draft.bgColor)}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            bgColor: e.target.checked ? "transparent" : "#ffffff",
                          }))
                        }
                      />
                      Transparent
                    </label>
                  </div>
                  <Input
                    type="color"
                    className="h-10 w-full cursor-pointer disabled:pointer-events-none disabled:opacity-40"
                    disabled={isTransparentBgColor(draft.bgColor)}
                    value={draft.bgColor.startsWith("#") ? draft.bgColor : "#ffffff"}
                    onChange={(e) => setDraft((p) => ({ ...p, bgColor: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Taille (px)</Label>
                  <Input type="number" min={120} max={2048} step={8} value={draft.size} onChange={(e) => setDraft((p) => ({ ...p, size: Number(e.target.value || 512) }))} />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <Label>Précision</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={draft.level}
                    onChange={(e) => setDraft((p) => ({ ...p, level: e.target.value as QrRecord["level"] }))}
                  >
                    <option value="L">L</option>
                    <option value="M">M</option>
                    <option value="Q">Q</option>
                    <option value="H">H (recommandé + logo)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Forme du QR</p>
              <QrStyleVisualPickers
                style={draft.qrStyle}
                onChange={(qrStyle) => setDraft((p) => ({ ...p, qrStyle }))}
              />
              <label className="mt-4 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.qrStyle.frame === "card"}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      qrStyle: { ...p.qrStyle, frame: e.target.checked ? "card" : "none" },
                    }))
                  }
                  className="rounded border-input"
                />
                <span className="text-sm text-muted-foreground">Cadre carte sur l&apos;aperçu</span>
              </label>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/15 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id="qr-default-logo"
                  checked={useDefaultLogo}
                  onCheckedChange={(c) => {
                    setUseDefaultLogo(c);
                    if (c) {
                      setDraft((d) => ({ ...d, logoUrl: defaultLogoDynaLipsRed }));
                    } else {
                      setDraft((d) => ({
                        ...d,
                        logoUrl: d.logoUrl && !isBundledDefaultLogo(d.logoUrl) ? d.logoUrl : logoGallery[0]?.dataUrl ?? "",
                      }));
                    }
                  }}
                />
                <Label htmlFor="qr-default-logo" className="cursor-pointer text-sm font-medium leading-snug">
                  Logo DynaPerf par défaut
                </Label>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-md sm:items-end">
                <Label className="text-xs text-muted-foreground">Importer des logos (plusieurs fichiers possibles)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  className="cursor-pointer text-sm"
                  onChange={(e) => void addFilesToGallery(e.target.files)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} className="gap-2">
                <FontAwesomeIcon icon={editingId ? faFloppyDisk : faPlus} className="h-3.5 w-3.5" />
                {editingId ? "Enregistrer" : "Créer le QR code"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetDraft}>
                  Annuler
                </Button>
              )}
            </div>
          </div>

          {/* Aperçu droite */}
          <div className="xl:sticky xl:top-20 min-w-0">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Aperçu</CardTitle>
                <CardDescription>Taille affichée : {previewSize}px (export : {draft.size}px, précision {draft.level})</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center overflow-x-auto pb-4 pt-0">
                <QrStylingPreview
                  value={draft.value}
                  size={previewSize}
                  fgColor={draft.fgColor}
                  bgColor={draft.bgColor}
                  level={draft.level}
                  logoUrl={effectiveLogoUrl}
                  style={draft.qrStyle}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bibliothèque logos */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Bibliothèque de logos</CardTitle>
            <CardDescription>
              Cliquez sur une vignette pour l&apos;appliquer au brouillon (désactive le logo par défaut). Retirer de la liste ne supprime pas les QR déjà enregistrés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logoGallery.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun logo importé — utilisez le champ ci-dessus pour en ajouter.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {logoGallery.map((item) => {
                  const active = !useDefaultLogo && draft.logoUrl === item.dataUrl;
                  return (
                    <div key={item.id} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setUseDefaultLogo(false);
                          setDraft((d) => ({ ...d, logoUrl: item.dataUrl }));
                        }}
                        className={cn(
                          "relative h-20 w-20 overflow-hidden rounded-xl border-2 bg-background p-1 transition",
                          active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
                        )}
                      >
                        <img src={item.dataUrl} alt="" className="h-full w-full object-contain" />
                      </button>
                      <button
                        type="button"
                        title="Retirer de la bibliothèque"
                        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeGalleryItem(item.id)}
                      >
                        <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liste des QR enregistrés */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">QR codes enregistrés</CardTitle>
            <CardDescription>{loading ? "Chargement…" : `${sorted.length} élément(s)`}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun QR code pour le moment.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sorted.map((r) => (
                  <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/10 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(r)}>
                          <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => void persistDelete(r.id)}>
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <QrStylingPreview
                        value={r.value}
                        size={Math.min(200, r.size)}
                        fgColor={r.fgColor}
                        bgColor={r.bgColor}
                        level={r.level}
                        logoUrl={isBundledDefaultLogo(r.logoUrl) ? defaultLogoDynaLipsRed : r.logoUrl}
                        style={r.qrStyle}
                      />
                    </div>
                    <p className="line-clamp-2 break-all text-[11px] text-muted-foreground">{r.value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}
