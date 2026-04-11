import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { publicAssetUrl } from "@/lib/basePath";
import { supabase } from "@/integrations/supabase/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAlignLeft,
  faCreditCard,
  faEnvelope,
  faFloppyDisk,
  faHeart,
  faIdCard,
  faLink,
  faPen,
  faPhone,
  faPlus,
  faQrcode,
  faSms,
  faStar,
  faTrash,
  faWifi,
} from "@fortawesome/free-solid-svg-icons";
import { faPaypal, faStripe, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { toast } from "sonner";
import defaultLogoDynaLipsRed from "@/assets/logo-dynalips-red.svg";
import { QrStylingPreview } from "@/components/qr/QrStylingPreview";
import { DEFAULT_QR_STYLE, mergeQrStyle, type QrStyleConfig } from "@/lib/qrCodeStyle";
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

const LOGO_FAVORITES_KEY = "dynaperf_qr_logo_favorites_v1";

const DOT_LABELS: { value: QrStyleConfig["dotsType"]; label: string }[] = [
  { value: "square", label: "Carrés" },
  { value: "dots", label: "Points" },
  { value: "rounded", label: "Arrondis" },
  { value: "extra-rounded", label: "Extra-arrondis" },
  { value: "classy", label: "Élégant" },
  { value: "classy-rounded", label: "Élégant arrondi" },
];

const CORNER_OUTER_LABELS: { value: QrStyleConfig["cornersSquareType"]; label: string }[] = [
  { value: "square", label: "Carré" },
  { value: "dot", label: "Disque" },
  { value: "extra-rounded", label: "Très arrondi" },
  { value: "rounded", label: "Arrondi" },
  { value: "dots", label: "Points" },
  { value: "classy", label: "Élégant" },
  { value: "classy-rounded", label: "Élégant arrondi" },
];

const CORNER_INNER_LABELS: { value: QrStyleConfig["cornersDotType"]; label: string }[] = [
  { value: "square", label: "Carré" },
  { value: "dot", label: "Point" },
  { value: "rounded", label: "Arrondi" },
  { value: "extra-rounded", label: "Extra-arrondi" },
  { value: "classy", label: "Élégant" },
  { value: "classy-rounded", label: "Élégant arrondi" },
  { value: "dots", label: "Points" },
];

type PresetCard = {
  kind: QrContentKind;
  title: string;
  description: string;
  icon: IconDefinition;
  accent: string;
};

const CONTENT_PRESETS: PresetCard[] = [
  { kind: "url", title: "Lien", description: "Lien vers n'importe quel site web", icon: faLink, accent: "text-emerald-600" },
  { kind: "email", title: "E-mail", description: "Envoyer un e-mail", icon: faEnvelope, accent: "text-sky-600" },
  { kind: "text", title: "Texte", description: "Partager un texte", icon: faAlignLeft, accent: "text-amber-600" },
  { kind: "tel", title: "Appel", description: "Passer un appel", icon: faPhone, accent: "text-emerald-700" },
  { kind: "sms", title: "SMS", description: "Envoyer un message", icon: faSms, accent: "text-blue-600" },
  { kind: "whatsapp", title: "WhatsApp", description: "Envoyer un message WhatsApp", icon: faWhatsapp, accent: "text-green-600" },
  { kind: "wifi", title: "Wi‑Fi", description: "Se connecter au réseau Wi‑Fi", icon: faWifi, accent: "text-teal-600" },
  { kind: "vcard", title: "Vcard", description: "Enregistrer un contact", icon: faIdCard, accent: "text-indigo-600" },
  { kind: "paypal", title: "PayPal", description: "Lien PayPal.me ou paiement", icon: faPaypal, accent: "text-blue-700" },
  { kind: "stripe", title: "Stripe", description: "Lien de paiement Stripe", icon: faStripe, accent: "text-violet-600" },
  {
    kind: "payment_url",
    title: "Paiement (URL)",
    description: "SumUp, Lydia, autre lien sécurisé",
    icon: faCreditCard,
    accent: "text-orange-600",
  },
  { kind: "custom", title: "Saisie libre", description: "Coller toute chaîne (URI, texte)", icon: faQrcode, accent: "text-slate-600" },
];

function makeEmpty(): QrRecord {
  return {
    id: crypto.randomUUID(),
    name: "",
    value: "https://",
    size: 220,
    fgColor: "#111827",
    bgColor: "#ffffff",
    level: "M",
    logoUrl: "",
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
  const [logoFavorites, setLogoFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LOGO_FAVORITES_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const sorted = useMemo(() => [...records].sort((a, b) => a.name.localeCompare(b.name, "fr")), [records]);

  useEffect(() => {
    localStorage.setItem(LOGO_FAVORITES_KEY, JSON.stringify(logoFavorites));
  }, [logoFavorites]);

  /** Synchronise la charge utile générée (hors mode saisie libre). */
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
          level: r.level as QrRecord["level"],
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
    const payload: QrRecord = {
      ...draft,
      name: draft.name.trim(),
      value: draft.value.trim(),
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
          logo_url: payload.logoUrl || null,
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
          logo_url: payload.logoUrl || null,
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
          level: data.level as QrRecord["level"],
          logoUrl: data.logo_url ?? "",
          qrStyle: mergeQrStyle(data.qr_style),
        },
        ...prev,
      ]);
      toast.success("QrCode créé.");
    }
    resetDraft();
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

  const addCurrentLogoToFavorites = () => {
    const url = (draft.logoUrl || "").trim();
    if (!url) {
      toast.error("Aucun logo à ajouter.");
      return;
    }
    if (url === defaultLogoDynaLipsRed) {
      toast.info("Ce logo est déjà le logo par défaut.");
      return;
    }
    setLogoFavorites((prev) => (prev.includes(url) ? prev : [url, ...prev]));
    toast.success("Logo ajouté aux favoris.");
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
    setDraft(r);
    setComposeKind("custom");
    setComposeFields({});
  };

  return (
    <AppLayout>
      <section className="mx-auto w-full max-w-6xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Gestion QrCode</h1>
          <p className="text-sm text-muted-foreground">Générez des QR stylés (points, coins, logo) comme sur qr.io — tout en local, sans API tierce.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="space-y-3 rounded-2xl border border-border/40 bg-card p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Type de contenu</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CONTENT_PRESETS.map((p) => (
                  <button
                    key={p.kind}
                    type="button"
                    onClick={() => pickPreset(p.kind)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border bg-background p-2 text-center transition hover:bg-muted/50",
                      composeKind === p.kind ? "border-primary ring-1 ring-primary/30" : "border-border/60",
                    )}
                  >
                    <FontAwesomeIcon icon={p.icon} className={cn("h-6 w-6", p.accent)} />
                    <span className="text-xs font-semibold leading-tight">{p.title}</span>
                    <span className="line-clamp-2 text-[10px] text-muted-foreground">{p.description}</span>
                    <span className="mt-1 w-full rounded-md bg-primary py-1 text-[10px] font-medium text-primary-foreground">Choisir</span>
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

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Couleur modules</Label>
                <Input type="color" value={draft.fgColor} onChange={(e) => setDraft((p) => ({ ...p, fgColor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fond</Label>
                <Input type="color" value={draft.bgColor} onChange={(e) => setDraft((p) => ({ ...p, bgColor: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="space-y-1">
                <Label>Motif des points (données)</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.qrStyle.dotsType}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      qrStyle: { ...p.qrStyle, dotsType: e.target.value as QrStyleConfig["dotsType"] },
                    }))
                  }
                >
                  {DOT_LABELS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Coins extérieurs (finder)</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.qrStyle.cornersSquareType}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      qrStyle: { ...p.qrStyle, cornersSquareType: e.target.value as QrStyleConfig["cornersSquareType"] },
                    }))
                  }
                >
                  {CORNER_OUTER_LABELS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Point central des coins</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.qrStyle.cornersDotType}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      qrStyle: { ...p.qrStyle, cornersDotType: e.target.value as QrStyleConfig["cornersDotType"] },
                    }))
                  }
                >
                  {CORNER_INNER_LABELS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="qr-frame"
                  checked={draft.qrStyle.frame === "card"}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      qrStyle: { ...p.qrStyle, frame: e.target.checked ? "card" : "none" },
                    }))
                  }
                />
                <Label htmlFor="qr-frame" className="font-normal">
                  Cadre carte (aperçu)
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Taille</Label>
                <Input type="number" min={120} max={600} value={draft.size} onChange={(e) => setDraft((p) => ({ ...p, size: Number(e.target.value || 220) }))} />
              </div>
              <div className="space-y-1">
                <Label>Correction d&apos;erreur</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.level}
                  onChange={(e) => setDraft((p) => ({ ...p, level: e.target.value as QrRecord["level"] }))}
                >
                  <option value="L">L (faible)</option>
                  <option value="M">M</option>
                  <option value="Q">Q</option>
                  <option value="H">H (forte + logo)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Logo central (URL ou fichier)</Label>
              <Input
                value={draft.logoUrl || ""}
                onChange={(e) => setDraft((p) => ({ ...p, logoUrl: e.target.value }))}
                placeholder="URL image / data URL"
              />
              <Input type="file" accept="image/*" onChange={(e) => void uploadLogo(e.target.files?.[0])} />
              <div className="flex flex-wrap gap-1 pt-1">
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setDraft((p) => ({ ...p, logoUrl: defaultLogoDynaLipsRed }))}>
                  <FontAwesomeIcon icon={faStar} className="h-3 w-3" />
                  Logo par défaut
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addCurrentLogoToFavorites}>
                  <FontAwesomeIcon icon={faHeart} className="h-3 w-3" />
                  Ajouter aux favoris
                </Button>
              </div>
              {logoFavorites.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {logoFavorites.map((fav, i) => (
                    <Button key={`${fav}-${i}`} type="button" variant="ghost" size="sm" onClick={() => setDraft((p) => ({ ...p, logoUrl: fav }))}>
                      Favori {i + 1}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/40 p-2">
              <p className="mb-2 text-xs text-muted-foreground">Aperçu</p>
              <QrStylingPreview
                value={draft.value}
                size={draft.size}
                fgColor={draft.fgColor}
                bgColor={draft.bgColor}
                level={draft.level}
                logoUrl={draft.logoUrl}
                style={draft.qrStyle}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={submit} className="gap-2">
                <FontAwesomeIcon icon={editingId ? faFloppyDisk : faPlus} className="h-3.5 w-3.5" />
                {editingId ? "Enregistrer" : "Créer"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetDraft}>
                  Annuler
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun QR code pour le moment.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.map((r) => (
                  <div key={r.id} className="space-y-2 rounded-xl border border-border/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(r)}>
                          <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => void persistDelete(r.id)}>
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <QrStylingPreview
                      value={r.value}
                      size={Math.min(r.size, 200)}
                      fgColor={r.fgColor}
                      bgColor={r.bgColor}
                      level={r.level}
                      logoUrl={r.logoUrl}
                      style={r.qrStyle}
                    />
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
