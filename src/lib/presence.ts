/** Statuts persistés en base (`user_presence.status`). */
export type PresenceStatus = "online" | "idle" | "dnd" | "stream" | "invisible";

/** Clé d’affichage (inclut « offline » dérivé du heartbeat, absent de la colonne status). */
export type PresenceDisplayKey = PresenceStatus | "offline";

export interface UserPresenceRow {
  user_id: string;
  status: PresenceStatus;
  expires_at: string | null;
  updated_at: string;
}

/** Fenêtre max sans heartbeat avant de considérer l’utilisateur déconnecté. */
export const PRESENCE_HEARTBEAT_TIMEOUT_MS = 20_000;

/** Couleurs par défaut (si les définitions DB ne sont pas chargées). */
export const PRESENCE_COLORS: Record<PresenceDisplayKey, string> = {
  offline: "#8c95a0",
  online: "#3ba45c",
  idle: "#f9a51a",
  dnd: "#ee4540",
  stream: "#593694",
  invisible: "#80848e",
};

export const PRESENCE_LABELS: Record<PresenceDisplayKey, string> = {
  offline: "Hors ligne",
  online: "En ligne",
  idle: "Inactif",
  dnd: "Ne pas déranger",
  stream: "En diffusion",
  invisible: "Invisible",
};

/**
 * Un utilisateur est considéré connecté si son heartbeat est récent.
 */
export function isPresenceConnected(row: UserPresenceRow | null | undefined): boolean {
  if (!row) return false;
  const updatedAtMs = new Date(row.updated_at).getTime();
  if (Number.isNaN(updatedAtMs)) return false;
  return Date.now() - updatedAtMs <= PRESENCE_HEARTBEAT_TIMEOUT_MS;
}

/**
 * Applique la fin de durée (idle/dnd/invisible temporisés) => retour en ligne.
 */
export function applyPresenceExpiry(row: UserPresenceRow): PresenceStatus {
  let st = row.status;
  if (row.expires_at) {
    const exp = new Date(row.expires_at).getTime();
    if (!Number.isNaN(exp) && Date.now() >= exp) st = "online";
  }
  return st;
}

/**
 * Statut logique affiché (libellé) :
 * - pas de ligne / déconnecté => offline,
 * - connecté => statut effectif après expiration.
 */
export function effectivePresence(row: UserPresenceRow | null | undefined): PresenceDisplayKey {
  if (!row) return "offline";
  if (!isPresenceConnected(row)) return "offline";
  return applyPresenceExpiry(row);
}

/**
 * Indique si l’utilisateur apparaît dans la liste « en ligne » (avatars, annuaire).
 */
export function isPresenceListedOnline(row: UserPresenceRow | null | undefined): boolean {
  if (!row) return false;
  if (!isPresenceConnected(row)) return false;
  return applyPresenceExpiry(row) !== "invisible";
}

/**
 * Clé visuelle pour l’avatar : null = pas d’indicateur (invisible connecté).
 */
export function avatarPresenceVisualKey(row: UserPresenceRow | null | undefined): PresenceDisplayKey | null {
  if (!row) return "offline";
  if (!isPresenceConnected(row)) return "offline";
  const st = applyPresenceExpiry(row);
  if (st === "invisible") return null;
  return st;
}

export function presenceLabelFor(
  row: UserPresenceRow | null | undefined,
  labelOverrides?: Partial<Record<PresenceDisplayKey, string>>,
): string {
  const key = effectivePresence(row);
  return labelOverrides?.[key] ?? PRESENCE_LABELS[key];
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
