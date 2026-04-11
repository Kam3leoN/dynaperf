/** Identifiants des modèles de contenu encodé dans le QR (comme qr.io). */
export type QrContentKind =
  | "custom"
  | "url"
  | "email"
  | "text"
  | "tel"
  | "sms"
  | "whatsapp"
  | "wifi"
  | "vcard"
  | "paypal"
  | "stripe"
  | "payment_url";

export interface QrComposeFields {
  url?: string;
  email?: string;
  emailSubject?: string;
  emailBody?: string;
  text?: string;
  phone?: string;
  smsBody?: string;
  waText?: string;
  wifiSsid?: string;
  wifiPass?: string;
  wifiEnc?: "WPA" | "WEP" | "nopass";
  vcardName?: string;
  vcardTel?: string;
  vcardEmail?: string;
  paypalSlug?: string;
  stripeUrl?: string;
  paymentUrl?: string;
}

function digitsOnlyPhone(s: string): string {
  return s.replace(/\s/g, "").replace(/[^\d+]/g, (c) => (c === "+" ? "+" : ""));
}

/** Construit la chaîne encodée dans le QR selon le type choisi. */
export function composeQrPayload(kind: QrContentKind, f: QrComposeFields): string {
  switch (kind) {
    case "custom":
      return (f.text ?? "").trim();
    case "url": {
      const u = (f.url ?? "").trim();
      if (!u) return "https://";
      if (/^https?:\/\//i.test(u)) return u;
      return `https://${u}`;
    }
    case "email": {
      const addr = (f.email ?? "").trim();
      const q = new URLSearchParams();
      const sub = (f.emailSubject ?? "").trim();
      const body = (f.emailBody ?? "").trim();
      if (sub) q.set("subject", sub);
      if (body) q.set("body", body);
      const qs = q.toString();
      return `mailto:${encodeURIComponent(addr)}${qs ? `?${qs}` : ""}`;
    }
    case "text":
      return (f.text ?? "").trim();
    case "tel": {
      const p = digitsOnlyPhone(f.phone ?? "");
      return p ? `tel:${p}` : "";
    }
    case "sms": {
      const p = digitsOnlyPhone(f.phone ?? "");
      const body = (f.smsBody ?? "").trim();
      if (!p) return "";
      return body ? `sms:${p}?body=${encodeURIComponent(body)}` : `sms:${p}`;
    }
    case "whatsapp": {
      let p = digitsOnlyPhone(f.phone ?? "").replace(/^\+/, "");
      if (p.startsWith("0")) p = `33${p.slice(1)}`;
      const txt = (f.waText ?? "").trim();
      if (!p) return "";
      return txt ? `https://wa.me/${p}?text=${encodeURIComponent(txt)}` : `https://wa.me/${p}`;
    }
    case "wifi": {
      const s = (f.wifiSsid ?? "").trim();
      const pass = f.wifiPass ?? "";
      const t = f.wifiEnc ?? "WPA";
      if (!s) return "";
      return `WIFI:T:${t};S:${escapeWifi(s)};P:${escapeWifi(pass)};H:false;;`;
    }
    case "vcard": {
      const n = (f.vcardName ?? "").trim();
      const tel = (f.vcardTel ?? "").trim();
      const em = (f.vcardEmail ?? "").trim();
      const parts: string[] = ["MECARD"];
      if (n) parts.push(`N:${n};`);
      if (tel) parts.push(`TEL:${tel};`);
      if (em) parts.push(`EMAIL:${em};`);
      parts.push(";;");
      return parts.join("");
    }
    case "paypal": {
      const slug = (f.paypalSlug ?? "").trim().replace(/^\/+/, "");
      if (!slug) return "https://paypal.me/";
      if (/^https?:\/\//i.test(slug)) return slug;
      return `https://paypal.me/${slug}`;
    }
    case "stripe": {
      const u = (f.stripeUrl ?? "").trim();
      return u || "https://";
    }
    case "payment_url": {
      const u = (f.paymentUrl ?? "").trim();
      return u || "https://";
    }
    default:
      return "";
  }
}

function escapeWifi(s: string): string {
  return s.replace(/([\\;,":])/g, "\\$1");
}
