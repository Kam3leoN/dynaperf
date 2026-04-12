import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
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
  faBorderAll,
  faChartPie,
  faCircleInfo,
  faCopy,
  faCreditCard,
  faEnvelope,
  faFloppyDisk,
  faDownload,
  faIdCard,
  faImage,
  faLink,
  faListUl,
  faPen,
  faPhone,
  faPlus,
  faQrcode,
  faSms,
  faTrash,
  faUpRightAndDownLeftFromCenter,
  faWifi,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { faPaypal, faStripe, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { toast } from "sonner";
import defaultLogoDynaLipsRed from "@/assets/logo-dynalips-red.svg";
import { QrStylingPreview } from "@/components/qr/QrStylingPreview";
import { QrAppearanceAccordion } from "@/components/qr/QrAppearanceAccordion";
import { QrPartColorControls } from "@/components/qr/QrPartColorControls";
import { QrStyleVisualPickers } from "@/components/qr/QrStyleSwatches";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DEFAULT_QR_STYLE, mergeQrStyle, type QrStyleConfig, type QrPartColors } from "@/lib/qrCodeStyle";
import { absoluteAppBaseUrl } from "@/lib/basePath";
import { isTransparentBgColor } from "@/lib/qrBgColor";
import { buildQrShapeInnerFragments, type QrShapeLibraryRow } from "@/lib/qrShapeMarkup";
import { renderQrSvgString } from "@/lib/qrSvgRender";
import { useQrShapeLibraryMap } from "@/hooks/useQrShapeLibrary";
import { composeQrPayload, type QrComposeFields, type QrContentKind } from "@/lib/qrContentCompose";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  /** Renseigné après chargement / enregistrement (colonne `scan_count`). */
  scanCount: number;
};

type LogoGalleryItem = { id: string; dataUrl: string };

const LOGO_GALLERY_KEY = "dynaperf_qr_logo_gallery_v2";

const PREVIEW_MAX = 320;

const EXPORT_SIZES = [256, 512, 1024, 2048] as const;
type ExportSize = (typeof EXPORT_SIZES)[number];

const EXPORT_DPIS = [72, 150, 300, 600] as const;
type ExportDpi = (typeof EXPORT_DPIS)[number];

function coerceExportSize(n: number): ExportSize {
  const xs = EXPORT_SIZES as readonly number[];
  if (xs.includes(n)) return n as ExportSize;
  return xs.reduce((best, x) => (Math.abs(x - n) < Math.abs(best - n) ? x : best), 512 as ExportSize);
}

const LEVEL_OPTIONS: { value: QrRecord["level"]; short: string; label: string }[] = [
  { value: "L", short: "L", label: "Low" },
  { value: "M", short: "M", label: "Medium" },
  { value: "Q", short: "Q", label: "Quartile" },
  { value: "H", short: "H", label: "High" },
];

function triggerFileDownload(blob: Blob, filename: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeExportBasename(name: string): string {
  const t = name.trim().replace(/[^\w\d\-_.\sàâäéèêëïîôùûüç]/gi, "").replace(/\s+/g, "-");
  return t || "qrcode";
}

/**
 * Rasterise le SVG en PNG. `designSizePx` = côté logique du QR ; `dpi` scale la sortie (référence 72 dpi).
 */
async function svgMarkupToPngBlob(svg: string, designSizePx: number, dpi: number): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image-load"));
      img.src = url;
    });
    const rasterSize = Math.max(1, Math.round((designSizePx * dpi) / 72));
    const canvas = document.createElement("canvas");
    canvas.width = rasterSize;
    canvas.height = rasterSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, rasterSize, rasterSize);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function qrTrackingUrl(qrId: string): string {
  return `${absoluteAppBaseUrl()}r/${qrId}`;
}

function isBundledDefaultLogo(url: string | undefined): boolean {
  if (!url) return false;
  return url === defaultLogoDynaLipsRed || url.includes("logo-dynalips-red");
}

/** Contenu encodé pour un QR enregistré (lien /r/:id si suivi activé). */
function encodedPayloadForRecord(record: QrRecord): string {
  if (record.qrStyle.encodeTrackingLink !== false) {
    return qrTrackingUrl(record.id);
  }
  return record.value;
}

function logoUrlForExport(record: QrRecord): string | undefined {
  const raw = (record.logoUrl || "").trim();
  if (!raw || isBundledDefaultLogo(record.logoUrl)) return undefined;
  return raw;
}

type PresetCard = {
  kind: QrContentKind;
  title: string;
  description: string;
  icon: IconDefinition;
};

/** Couleur unique des icônes (alignée sur le preset « Libre »). */
const PRESET_ICON_CLASS = "h-6 w-6 text-slate-600";

const CONTENT_PRESETS: PresetCard[] = [
  { kind: "url", title: "Lien", description: "Site web", icon: faLink },
  { kind: "email", title: "E-mail", description: "Envoyer un e-mail", icon: faEnvelope },
  { kind: "text", title: "Texte", description: "Texte brut", icon: faAlignLeft },
  { kind: "tel", title: "Appel", description: "Numéro à appeler", icon: faPhone },
  { kind: "sms", title: "SMS", description: "SMS", icon: faSms },
  { kind: "whatsapp", title: "WhatsApp", description: "Message WA", icon: faWhatsapp },
  { kind: "wifi", title: "Wi‑Fi", description: "Connexion Wi‑Fi", icon: faWifi },
  { kind: "vcard", title: "Vcard", description: "Contact", icon: faIdCard },
  { kind: "paypal", title: "PayPal", description: "PayPal.me", icon: faPaypal },
  { kind: "stripe", title: "Stripe", description: "Lien Stripe", icon: faStripe },
  {
    kind: "payment_url",
    title: "Paiement",
    description: "URL de paiement",
    icon: faCreditCard,
  },
  { kind: "custom", title: "Libre", description: "Coller une chaîne", icon: faQrcode },
];

function defaultPartColors(fg: string): QrPartColors {
  return {
    dots: fg,
    outer: fg,
    inner: fg,
    dotsFill: "solid",
    dotsGradientEnd: "#2196f3",
    dotsGradientPreset: "diagonal-right",
  };
}

function makeEmpty(): QrRecord {
  const fg = "#111827";
  return {
    id: crypto.randomUUID(),
    name: "",
    value: "https://",
    size: 512,
    fgColor: fg,
    bgColor: "#ffffff",
    level: "M",
    logoUrl: "",
    qrStyle: { ...DEFAULT_QR_STYLE, partColors: defaultPartColors(fg) },
    scanCount: 0,
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

function QrSavedCardPreview({
  record,
  shapeById,
}: {
  record: QrRecord;
  shapeById: Map<string, QrShapeLibraryRow>;
}) {
  const fr = useMemo(
    () => (shapeById.size > 0 ? buildQrShapeInnerFragments(record.qrStyle, shapeById) : null),
    [record.qrStyle, shapeById],
  );
  return (
    <QrStylingPreview
      value={encodedPayloadForRecord(record)}
      size={Math.min(200, record.size)}
      fgColor={record.fgColor}
      bgColor={record.bgColor}
      level={record.level}
      logoUrl={logoUrlForExport(record)}
      style={record.qrStyle}
      shapeInnerFragments={fr}
    />
  );
}

export default function QrCodeManager() {
  const location = useLocation();
  const isCreatePage = location.pathname.endsWith("/new");

  const [records, setRecords] = useState<QrRecord[]>([]);
  const [draft, setDraft] = useState<QrRecord>(() => makeEmpty());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [composeKind, setComposeKind] = useState<QrContentKind>("url");
  const [composeFields, setComposeFields] = useState<QrComposeFields>({});
  /** Affiche un logo au centre du QR (désactivé par défaut). */
  const [showLogo, setShowLogo] = useState(false);
  /** Format du prochain export fichier (préférence locale, non persistée). */
  const [exportFormat, setExportFormat] = useState<"png" | "svg">("svg");
  /** DPI pour l’export PNG (référence 72) — préférence locale, non persistée. */
  const [exportDpi, setExportDpi] = useState<ExportDpi>(300);
  const [logoGallery, setLogoGallery] = useState<LogoGalleryItem[]>(() => loadGallery());

  const sorted = useMemo(() => [...records].sort((a, b) => a.name.localeCompare(b.name, "fr")), [records]);

  const { byId: shapeById, byKind } = useQrShapeLibraryMap();

  const previewShapeFragments = useMemo(
    () => (shapeById.size > 0 ? buildQrShapeInnerFragments(draft.qrStyle, shapeById) : null),
    [draft.qrStyle, shapeById],
  );

  /** Contenu réellement encodé dans le QR : lien /r/:id si suivi activé et fiche enregistrée, sinon la cible. */
  const qrEncodedPayload = useMemo(() => {
    if (editingId && draft.qrStyle.encodeTrackingLink !== false) {
      return qrTrackingUrl(editingId);
    }
    return draft.value;
  }, [editingId, draft.value, draft.qrStyle.encodeTrackingLink]);

  const effectiveLogoUrl = useMemo(() => {
    if (!showLogo) return undefined;
    const u = (draft.logoUrl || "").trim();
    return u || undefined;
  }, [showLogo, draft.logoUrl]);

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
          size: coerceExportSize(r.size),
          fgColor: r.fg_color,
          bgColor: r.bg_color,
          level: (r.level as QrRecord["level"]) || "M",
          logoUrl: r.logo_url ?? "",
          qrStyle: mergeQrStyle(r.qr_style),
          scanCount: typeof r.scan_count === "number" ? r.scan_count : 0,
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
    setShowLogo(false);
  };

  useEffect(() => {
    if (!location.pathname.endsWith("/new")) return;
    resetDraft();
    // Intentionnel : réinitialiser le brouillon à chaque entrée sur /qrcodes/new
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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
    const logoPersist = showLogo ? (draft.logoUrl || "").trim() || null : null;
    const payload: QrRecord = {
      ...draft,
      name: draft.name.trim(),
      value: draft.value.trim(),
      size: coerceExportSize(draft.size),
      logoUrl: logoPersist ?? "",
      scanCount: draft.scanCount ?? 0,
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
      setRecords((prev) =>
        prev.map((r) => (r.id === editingId ? { ...payload, scanCount: r.scanCount } : r)),
      );
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
          size: coerceExportSize(data.size),
          fgColor: data.fg_color,
          bgColor: data.bg_color,
          level: (data.level as QrRecord["level"]) || "M",
          logoUrl: data.logo_url ?? "",
          qrStyle: mergeQrStyle(data.qr_style),
          scanCount: typeof data.scan_count === "number" ? data.scan_count : 0,
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
    setShowLogo(true);
    setDraft((d) => ({ ...d, logoUrl: next[0].dataUrl }));
    toast.success(next.length > 1 ? `${next.length} logos ajoutés` : "Logo ajouté à la bibliothèque");
  };

  const removeGalleryItem = (id: string) => {
    setLogoGallery((prev) => {
      const item = prev.find((x) => x.id === id);
      if (!item) return prev;
      const rest = prev.filter((x) => x.id !== id);
      setDraft((d) => {
        if (d.logoUrl !== item.dataUrl) return d;
        const next = rest[0]?.dataUrl;
        if (!next) {
          setTimeout(() => setShowLogo(false), 0);
          return { ...d, logoUrl: "" };
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
    const raw = (r.logoUrl || "").trim();
    const hadBundledOnly = !raw || isBundledDefaultLogo(r.logoUrl);
    setShowLogo(!hadBundledOnly && Boolean(raw));
    setDraft({
      ...r,
      logoUrl: hadBundledOnly ? "" : raw,
      level: r.level || "M",
      size: coerceExportSize(r.size || 512),
      scanCount: r.scanCount ?? 0,
    });
  };

  const previewSize = Math.min(PREVIEW_MAX, Math.max(160, draft.size));

  const copyTrackingLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(qrTrackingUrl(id));
      toast.success("Lien de suivi copié.");
    } catch {
      toast.error("Copie impossible.");
    }
  };

  const downloadExportedQr = async () => {
    if (!validatePayload(draft.value)) {
      toast.error("Contenu du QR invalide — corrigez le brouillon avant export.");
      return;
    }
    if (shapeById.size === 0) {
      toast.error("Bibliothèque de formes indisponible — réessayez dans un instant.");
      return;
    }
    const size = coerceExportSize(draft.size);
    try {
      const fr = buildQrShapeInnerFragments(draft.qrStyle, shapeById);
      const svg = renderQrSvgString({
        value: qrEncodedPayload,
        size,
        fgColor: draft.fgColor,
        bgColor: draft.bgColor,
        level: draft.level,
        style: draft.qrStyle,
        logoUrl: effectiveLogoUrl,
        shapeInnerFragments: fr,
      });
      const base = sanitizeExportBasename(draft.name || "qrcode");
      if (exportFormat === "svg") {
        triggerFileDownload(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${base}.svg`);
        toast.success("SVG téléchargé.");
        return;
      }
      const png = await svgMarkupToPngBlob(svg, size, exportDpi);
      triggerFileDownload(png, `${base}-${size}px-${exportDpi}dpi.png`);
      toast.success("PNG téléchargé.");
    } catch {
      toast.error("Export impossible (vérifiez le contenu et le logo).");
    }
  };

  const downloadSavedQr = async (record: QrRecord) => {
    if (shapeById.size === 0) {
      toast.error("Bibliothèque de formes indisponible — réessayez dans un instant.");
      return;
    }
    const payload = encodedPayloadForRecord(record).trim();
    if (!payload) {
      toast.error("Contenu du QR vide — ouvrez l’édition pour corriger.");
      return;
    }
    const size = coerceExportSize(record.size);
    try {
      const fr = buildQrShapeInnerFragments(record.qrStyle, shapeById);
      const svg = renderQrSvgString({
        value: payload,
        size,
        fgColor: record.fgColor,
        bgColor: record.bgColor,
        level: record.level,
        style: record.qrStyle,
        logoUrl: logoUrlForExport(record),
        shapeInnerFragments: fr,
      });
      const base = sanitizeExportBasename(record.name || "qrcode");
      if (exportFormat === "svg") {
        triggerFileDownload(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${base}.svg`);
        toast.success("SVG téléchargé.");
        return;
      }
      const png = await svgMarkupToPngBlob(svg, size, exportDpi);
      triggerFileDownload(png, `${base}-${size}px-${exportDpi}dpi.png`);
      toast.success("PNG téléchargé.");
    } catch {
      toast.error("Export impossible (vérifiez le logo et les formes).");
    }
  };

  return (
    <AppLayout>
      <section className="app-page-shell-wide min-w-0 w-full space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-semibold">{isCreatePage ? "Créer un QrCode" : "Gérer les QrCode"}</h1>
          <p className="text-sm text-muted-foreground">
            {isCreatePage
              ? "Renseignez le contenu et l’apparence, puis enregistrez — aperçu à droite."
              : "Liste des codes enregistrés, édition et personnalisation par sections repliables (aperçu à droite)."}
          </p>
        </div>

        {editingId && draft.value.trim() === qrTrackingUrl(editingId).trim() ? (
          <Alert variant="destructive" className="border-destructive/60">
            <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4" aria-hidden />
            <AlertDescription>
              La cible enregistrée est le lien de suivi : indiquez plutôt l&apos;URL finale (votre site, etc.). Sinon la redirection après scan
              peut boucler. Le QR peut toujours encoder le lien <span className="font-mono">/r/…</span> grâce au réglage dans Statistiques.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_min(360px,34%)] xl:items-start">
          {/* Colonne édition */}
          <div className="min-w-0 space-y-4 rounded-2xl border border-border/40 bg-card p-4 sm:p-5">
            <QrAppearanceAccordion
              defaultOpen={["contenu", "cadre"]}
              sections={[
                {
                  value: "contenu",
                  icon: faListUl,
                  title: "Type de contenu",
                  description: "Preset, nom du QR et champs selon le format choisi.",
                  content: (
                    <div className="space-y-4">
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
                            <FontAwesomeIcon icon={p.icon} className={PRESET_ICON_CLASS} />
                            <span className="text-xs font-semibold leading-tight">{p.title}</span>
                            <span className="line-clamp-2 text-[10px] text-muted-foreground">{p.description}</span>
                          </button>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <Label>Nom</Label>
                        <Input
                          value={draft.name}
                          onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Ex: Flyer printemps"
                        />
                      </div>
                      <ContentFields
                        kind={composeKind}
                        fields={composeFields}
                        onChange={(patch) => setComposeFields((f) => ({ ...f, ...patch }))}
                        valueCustom={draft.value}
                        onValueCustom={(v) => setDraft((d) => ({ ...d, value: v }))}
                      />
                    </div>
                  ),
                },
                  {
                    value: "cadre",
                    icon: faBorderAll,
                    title: "Cadre",
                    description: "Fond, voiles (covers) et cadre carte sur l’aperçu.",
                    content: (
                      <div className="space-y-4">
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/40 bg-background/80 px-3 py-2.5">
                          <input
                            type="checkbox"
                            className="rounded border-input"
                            checked={draft.qrStyle.frame === "card"}
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                qrStyle: { ...p.qrStyle, frame: e.target.checked ? "card" : "none" },
                              }))
                            }
                          />
                          <span className="text-sm text-foreground">Cadre carte sur l&apos;aperçu</span>
                        </label>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                              className="h-10 w-full max-w-[200px] cursor-pointer disabled:pointer-events-none disabled:opacity-40"
                              disabled={isTransparentBgColor(draft.bgColor)}
                              value={draft.bgColor.startsWith("#") ? draft.bgColor : "#ffffff"}
                              onChange={(e) => setDraft((p) => ({ ...p, bgColor: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Voile sur le code (covers)</Label>
                          <QrStyleVisualPickers
                            sections={["cover"]}
                            dotShapes={byKind.dot}
                            cornerShapes={byKind.corner}
                            coverShapes={byKind.cover}
                            style={draft.qrStyle}
                            onChange={(qrStyle) => setDraft((p) => ({ ...p, qrStyle }))}
                          />
                        </div>
                      </div>
                    ),
                  },
                  {
                    value: "motif",
                    icon: faQrcode,
                    title: "Motif du QR Code",
                    description: "Forme des modules (presets type qr-code-styling), couleurs et dégradé.",
                    content: (
                      <div className="space-y-5">
                        <QrStyleVisualPickers
                          sections={["modules"]}
                          dotShapes={byKind.dot}
                          cornerShapes={byKind.corner}
                          coverShapes={byKind.cover}
                          style={draft.qrStyle}
                          onChange={(qrStyle) => setDraft((p) => ({ ...p, qrStyle }))}
                        />
                        <div className="flex flex-col gap-2 rounded-lg border border-border/40 bg-muted/10 px-3 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <Switch
                              id="qr-dots-round-size"
                              checked={draft.qrStyle.dotsRoundSize !== false}
                              onCheckedChange={(c) =>
                                setDraft((p) => ({
                                  ...p,
                                  qrStyle: { ...p.qrStyle, dotsRoundSize: c },
                                }))
                              }
                            />
                            <Label htmlFor="qr-dots-round-size" className="cursor-pointer text-sm font-normal leading-snug">
                              Contours adoucis sur les modules (équivalent{" "}
                              <span className="font-mono text-xs">dotsOptions.roundSize</span> · qr-code-styling)
                            </Label>
                          </div>
                          <p className="pl-1 text-[11px] leading-snug text-muted-foreground">
                            Désactiver applique un rendu plus net sur l’export SVG (<span className="font-mono">shape-rendering: crispEdges</span>),
                            proche du comportement « carré » lorsque la lib désactive <span className="font-mono">roundSize</span>.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Couleur du motif</Label>
                          <QrPartColorControls
                            scope="dots"
                            fgFallback={draft.fgColor}
                            qrStyle={draft.qrStyle}
                            onUpdate={(merged) =>
                              setDraft((d) => ({
                                ...d,
                                fgColor: merged.dots,
                                qrStyle: { ...d.qrStyle, partColors: merged },
                              }))
                            }
                          />
                        </div>
                        <Alert className="border-border/50 bg-muted/30">
                          <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 text-muted-foreground" />
                          <AlertDescription className="text-xs text-muted-foreground sm:text-sm">
                            Pour une lecture fiable, privilégiez un <strong className="font-medium text-foreground">contraste élevé</strong>{" "}
                            entre les modules et le fond.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ),
                  },
                  {
                    value: "coins",
                    icon: faUpRightAndDownLeftFromCenter,
                    title: "Coins du QR Code",
                    description: "Style des repères et couleurs des bordures et du centre des yeux.",
                    content: (
                      <div className="space-y-6">
                        <div className="grid gap-6 lg:grid-cols-2">
                          <QrStyleVisualPickers
                            sections={["outer"]}
                            dotShapes={byKind.dot}
                            cornerShapes={byKind.corner}
                            coverShapes={byKind.cover}
                            style={draft.qrStyle}
                            onChange={(qrStyle) => setDraft((p) => ({ ...p, qrStyle }))}
                          />
                          <QrStyleVisualPickers
                            sections={["inner"]}
                            dotShapes={byKind.dot}
                            cornerShapes={byKind.corner}
                            coverShapes={byKind.cover}
                            style={draft.qrStyle}
                            onChange={(qrStyle) => setDraft((p) => ({ ...p, qrStyle }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Couleurs des coins</Label>
                          <QrPartColorControls
                            scope="corners"
                            fgFallback={draft.fgColor}
                            qrStyle={draft.qrStyle}
                            onUpdate={(merged) =>
                              setDraft((d) => ({
                                ...d,
                                fgColor: merged.dots,
                                qrStyle: { ...d.qrStyle, partColors: merged },
                              }))
                            }
                          />
                        </div>
                      </div>
                    ),
                  },
                  {
                    value: "logo",
                    icon: faImage,
                    title: "Ajouter un logo",
                    description: "Activer l’affichage, importer des images et choisir dans la bibliothèque.",
                    content: (
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <Switch
                            id="qr-show-logo"
                            checked={showLogo}
                            onCheckedChange={(on) => {
                              setShowLogo(on);
                              if (on) {
                                setDraft((d) => {
                                  const cur = (d.logoUrl || "").trim();
                                  if (cur) return d;
                                  const first = logoGallery[0]?.dataUrl;
                                  return first ? { ...d, logoUrl: first } : d;
                                });
                              } else {
                                setDraft((d) => ({ ...d, logoUrl: "" }));
                              }
                            }}
                          />
                          <Label htmlFor="qr-show-logo" className="cursor-pointer text-sm font-medium leading-snug">
                            Afficher logo
                          </Label>
                        </div>
                        {showLogo ? (
                          <div className="flex flex-col gap-5 border-l-2 border-primary/20 pl-4 sm:gap-6 sm:pl-5">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Importer des images (plusieurs fichiers possibles)</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                multiple
                                className="cursor-pointer text-sm"
                                onChange={(e) => void addFilesToGallery(e.target.files)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-foreground">Bibliothèque</Label>
                              {logoGallery.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Aucune image — importez ci-dessus pour remplir la bibliothèque et sélectionner un logo.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-3">
                                  {logoGallery.map((item) => {
                                    const active = draft.logoUrl === item.dataUrl;
                                    return (
                                      <div key={item.id} className="relative">
                                        <button
                                          type="button"
                                          onClick={() => setDraft((d) => ({ ...d, logoUrl: item.dataUrl }))}
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
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    value: "stats",
                    icon: faChartPie,
                    title: "Statistiques",
                    description: "Outils et données pour évaluer la performance (scans du lien public).",
                    content: (
                      <div className="space-y-4">
                        {!editingId ? (
                          <p className="text-sm text-muted-foreground">
                            Enregistrez le QR code puis rouvrez-le depuis la liste pour afficher le compteur de scans et le lien de suivi dédié.
                          </p>
                        ) : (
                          <>
                            <div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scans enregistrés</p>
                              <p className="text-2xl font-semibold tabular-nums">{draft.scanCount ?? 0}</p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">Lien public de suivi (comptage des scans)</Label>
                              <div className="flex flex-wrap gap-2">
                                <Input readOnly value={qrTrackingUrl(editingId)} className="min-w-0 flex-1 font-mono text-xs" />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0 gap-2"
                                  onClick={() => void copyTrackingLink(editingId)}
                                >
                                  <FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5" />
                                  Copier
                                </Button>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 bg-muted/10 px-3 py-3">
                                <Switch
                                  id="qr-encode-tracking"
                                  checked={draft.qrStyle.encodeTrackingLink !== false}
                                  onCheckedChange={(on) =>
                                    setDraft((d) => ({
                                      ...d,
                                      qrStyle: { ...d.qrStyle, encodeTrackingLink: on },
                                    }))
                                  }
                                />
                                <Label htmlFor="qr-encode-tracking" className="max-w-xl cursor-pointer text-sm font-normal leading-snug">
                                  Encoder ce lien <span className="font-mono">/r/…</span> dans le QR (recommandé pour les statistiques)
                                </Label>
                              </div>
                              <p className="text-[11px] leading-snug text-muted-foreground">
                                La colonne « cible » enregistrée sert à la redirection après visite du lien public. Les compteurs
                                n&apos;augmentent que si le QR ouvre ce lien <span className="font-mono">/r/…</span>, pas une URL directe
                                vers la cible.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ),
                  },
                  {
                    value: "taille_export",
                    icon: faDownload,
                    title: "Taille, qualité et export",
                    description: "Dimensions, correction d’erreurs, résolution PNG (dpi) et format de fichier.",
                    content: (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Taille (px)</Label>
                          <div className="flex flex-wrap gap-2">
                            {EXPORT_SIZES.map((s) => (
                              <Button
                                key={s}
                                type="button"
                                size="sm"
                                variant={draft.size === s ? "default" : "outline"}
                                className="min-w-[4.25rem] tabular-nums"
                                onClick={() => setDraft((p) => ({ ...p, size: s }))}
                              >
                                {s}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Précision (correction d&apos;erreurs)</Label>
                          <div className="flex flex-wrap gap-2">
                            {LEVEL_OPTIONS.map((opt) => (
                              <Button
                                key={opt.value}
                                type="button"
                                size="sm"
                                variant={draft.level === opt.value ? "default" : "outline"}
                                className="gap-1"
                                title={`${opt.label} (${opt.value})`}
                                onClick={() => setDraft((p) => ({ ...p, level: opt.value }))}
                              >
                                <span className="font-semibold">{opt.short}</span>
                                <span className="hidden text-xs font-normal opacity-90 sm:inline">{opt.label}</span>
                              </Button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Par défaut : <strong className="font-medium text-foreground">512 px</strong> et{" "}
                            <strong className="font-medium text-foreground">Medium (M)</strong>. Haute (H) recommandée si vous affichez un logo au centre.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Résolution (dpi) — export PNG</Label>
                          <div className="flex flex-wrap items-center gap-3">
                            <Select
                              value={String(exportDpi)}
                              onValueChange={(v) => setExportDpi(Number(v) as ExportDpi)}
                            >
                              <SelectTrigger className="w-[8.5rem]">
                                <SelectValue placeholder="dpi" />
                              </SelectTrigger>
                              <SelectContent>
                                {EXPORT_DPIS.map((d) => (
                                  <SelectItem key={d} value={String(d)}>
                                    {d} dpi
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-[11px] text-muted-foreground">
                              S’applique au PNG rasterisé (réf. 72 dpi). Le SVG reste vectoriel.
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Export fichier</Label>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={exportFormat === "png" ? "default" : "outline"}
                                onClick={() => setExportFormat("png")}
                              >
                                PNG
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={exportFormat === "svg" ? "default" : "outline"}
                                onClick={() => setExportFormat("svg")}
                              >
                                SVG
                              </Button>
                            </div>
                            <Button type="button" size="sm" variant="secondary" className="gap-2" onClick={() => void downloadExportedQr()}>
                              <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                              Télécharger
                            </Button>
                          </div>
                        </div>
                      </div>
                    ),
                  },
                ]}
            />

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
                <CardDescription>
                  Aperçu {previewSize}px · export {draft.size}px ·{" "}
                  {LEVEL_OPTIONS.find((o) => o.value === draft.level)?.label ?? draft.level} ({draft.level})
                  {editingId && draft.qrStyle.encodeTrackingLink !== false ? (
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      Encodage du QR : lien de suivi public — la cible enregistrée sert à la redirection après le scan.
                    </span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center overflow-x-auto pb-4 pt-0">
                <QrStylingPreview
                  value={qrEncodedPayload}
                  size={previewSize}
                  fgColor={draft.fgColor}
                  bgColor={draft.bgColor}
                  level={draft.level}
                  logoUrl={effectiveLogoUrl}
                  style={draft.qrStyle}
                  shapeInnerFragments={previewShapeFragments}
                />
              </CardContent>
            </Card>
          </div>
        </div>

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
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">{r.scanCount ?? 0} scan(s)</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Télécharger"
                          onClick={() => void downloadSavedQr(r)}
                        >
                          <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(r)}>
                          <FontAwesomeIcon icon={faPen} className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => void persistDelete(r.id)}>
                          <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <QrSavedCardPreview record={r} shapeById={shapeById} />
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
