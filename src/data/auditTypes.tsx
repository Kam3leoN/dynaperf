import type { ReactNode } from "react";
import iconRDPresentiel from "@/assets/rencontre-presentiel.svg";
import iconRDDistanciel from "@/assets/rencontre-distanciel.svg";
import iconClubAffaires from "@/assets/club-affaires.svg";
import iconRDVCommercial from "@/assets/rdv-business.svg";
import iconMiseEnPlace from "@/assets/mise-en-place.svg";
import iconEvenementiel from "@/assets/evenementiel.svg";

export interface AuditTypeOption {
  label: string;
  color: string;
  icon: string;
  key: string;
  desktopLabel?: ReactNode;
}

/** Types d'événement proposés lors de la création d'un nouvel audit */
export const AUDIT_TYPE_OPTIONS: AuditTypeOption[] = [
  {
    label: "Rencontre Dirigeants Présentiel",
    color: "#ee4540",
    icon: iconRDPresentiel,
    key: "RD Présentiel",
  },
  {
    label: "Rencontre Dirigeants Distanciel",
    color: "#234653",
    icon: iconRDDistanciel,
    key: "RD Distanciel",
  },
  {
    label: "Club d'Affaires",
    color: "#ffbd23",
    icon: iconClubAffaires,
    key: "Club Affaires",
    desktopLabel: (
      <>
        Club
        <br />
        d'Affaires
      </>
    ),
  },
  {
    label: "Rendez-Vous Commercial",
    color: "#5dbcb9",
    icon: iconRDVCommercial,
    key: "RDV Commercial",
  },
  {
    label: "Mise en Place",
    color: "#8b5cf6",
    icon: iconMiseEnPlace,
    key: "Mise en Place",
  },
  {
    label: "RD Événementiel",
    color: "#e67e22",
    icon: iconEvenementiel,
    key: "RD Événementiel",
    desktopLabel: (
      <>
        RD
        <br />
        Événementiel
      </>
    ),
  },
];
