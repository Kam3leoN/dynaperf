/** Statuts de présence (style Discord). */
export type PresenceStatus = "online" | "idle" | "dnd" | "invisible";

export interface UserPresenceRow {
  user_id: string;
  status: PresenceStatus;
  expires_at: string | null;
  updated_at: string;
}

export const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: "#23a559",
  idle: "#f0b232",
  /** Ne pas déranger (rouge demandé). */
  dnd: "#ee4540",
  /** Hors ligne / invisible (gris). */
  invisible: "#80848e",
};

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: "En ligne",
  idle: "Inactif",
  dnd: "Ne pas déranger",
  invisible: "Invisible",
};

/**
 * Statut affiché pour un autre utilisateur (ou avant chargement) : sans ligne = hors ligne / invisible.
 * Si `expires_at` est dépassé, retour à « en ligne » (fin d’un statut temporisé).
 */
export function effectivePresence(row: UserPresenceRow | null | undefined): PresenceStatus {
  if (!row) return "invisible";
  if (row.expires_at) {
    const exp = new Date(row.expires_at).getTime();
    if (!Number.isNaN(exp) && Date.now() >= exp) return "online";
  }
  return row.status;
}

export function presenceLabelFor(row: UserPresenceRow | null | undefined): string {
  return PRESENCE_LABELS[effectivePresence(row)];
}

export type DurationKey = "15m" | "1h" | "8h" | "24h" | "3d" | "forever";

export const DURATION_OPTIONS: { key: DurationKey; label: string }[] = [
  { key: "15m", label: "Pendant 15 minutes" },
  { key: "1h", label: "Pendant 1 heure" },
  { key: "8h", label: "Pendant 8 heures" },
  { key: "24h", label: "Pendant 24 heures" },
  { key: "3d", label: "Pendant 3 jours" },
  { key: "forever", label: "Pour toujours" },
];

export function expiresAtForDuration(from: Date, key: DurationKey): string | null {
  if (key === "forever") return null;
  const d = new Date(from.getTime());
  switch (key) {
    case "15m":
      d.setMinutes(d.getMinutes() + 15);
      break;
    case "1h":
      d.setHours(d.getHours() + 1);
      break;
    case "8h":
      d.setHours(d.getHours() + 8);
      break;
    case "24h":
      d.setHours(d.getHours() + 24);
      break;
    case "3d":
      d.setDate(d.getDate() + 3);
      break;
    default:
      return null;
  }
  return d.toISOString();
}
