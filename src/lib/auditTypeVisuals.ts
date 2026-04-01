import iconRDPresentiel from "@/assets/rencontre-presentiel.svg";
import iconRDDistanciel from "@/assets/rencontre-distanciel.svg";
import iconClubAffaires from "@/assets/club-affaires.svg";
import iconRDVCommercial from "@/assets/rdv-business.svg";
import iconMiseEnPlace from "@/assets/mise-en-place.svg";
import iconEvenementiel from "@/assets/evenementiel.svg";

/** Map audit type keys to their SVG icon and default color */
export const auditTypeIcons: Record<string, { icon: string; color: string }> = {
  "RD Présentiel": { icon: iconRDPresentiel, color: "#ee4540" },
  "RD Distanciel": { icon: iconRDDistanciel, color: "#234653" },
  "Club Affaires": { icon: iconClubAffaires, color: "#ffbd23" },
  "RDV Commercial": { icon: iconRDVCommercial, color: "#5dbcb9" },
  "Mise en Place": { icon: iconMiseEnPlace, color: "#8b5cf6" },
  "RD Événementiel": { icon: iconEvenementiel, color: "#e67e22" },
};

/** Get SVG icon and color for a given audit type key, with fallback */
export function getAuditTypeVisual(key: string, dbColor?: string | null) {
  const mapped = auditTypeIcons[key];
  return {
    icon: mapped?.icon || null,
    color: dbColor || mapped?.color || "#6b7280",
  };
}
