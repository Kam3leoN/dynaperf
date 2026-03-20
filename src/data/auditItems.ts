export interface AuditItemDef {
  id: number;
  title: string;
  description: string;
  maxPoints: number;
  condition: string;
  /** "boolean" = oui/non (0 or maxPoints), "number" = numeric input, "checklist" = array of checkboxes */
  inputType: "boolean" | "number" | "checklist";
  /** For number type: scoring rules description */
  scoringRules?: string;
  /** For checklist type: list of items */
  checklistItems?: string[];
}

export const AUDIT_ITEMS: AuditItemDef[] = [
  {
    id: 1,
    title: "Le Lieu",
    description:
      "Le lieu est adapté et en adéquation avec les recommandations du réseau.\nLieu haut de gamme, réputé et bien aménagé :\n- Hôtel 3 à 5 étoiles\n- Golf\n- Restaurant\n- Lieu de réception type séminaire\n- Centre de co-working\n\nAccès facile proche et bien desservi.\nParking ou transports en commun proche à moins de 250 m du lieu.",
    maxPoints: 1,
    condition: "Tous les critères mentionnés doivent être réunis.",
    inputType: "boolean",
  },
  {
    id: 2,
    title: "La Salle",
    description:
      "La salle répond strictement aux exigences et critères validés par le réseau.\n- 2m² par participant minimum\n- Lumière naturelle, salle avec fenêtre\n- Température ambiante ~20°\n- Pièce aérée en amont\n- Volume sonore contrôlé\n- Tables disposées en îlot",
    maxPoints: 1,
    condition: "Tous les critères mentionnés doivent être réunis.",
    inputType: "boolean",
  },
  {
    id: 3,
    title: "Nombre de participants",
    description:
      "Le nombre de participants correspond aux attentes du réseau :\n30 participants (20 adhérents + 10 invités)",
    maxPoints: 10,
    condition:
      "Contrôle visuel de l'auditeur",
    scoringRules:
      "0 à 9 participants → 0 pts\n10 à 19 participants → 1 pt\n20 à 25 participants → 3 pts\n26 à 30 participants → 5 pts\nPlus de 30 participants → 10 pts",
    inputType: "number",
  },
  {
    id: 4,
    title: "Nombre d'invités",
    description: "Le nombre d'invités correspond aux attentes du réseau.",
    maxPoints: 10,
    condition: "Contrôle visuel de l'auditeur\n1 point par invité dans la limite de 10 points.",
    scoringRules: "1 point par invité (max 10 pts)",
    inputType: "number",
  },
  {
    id: 5,
    title: "Invité(s) contacté(s)",
    description:
      "a. Les invités doivent être tous appelés.\nb. Le déroulé de la réunion doit leur être présenté en amont.\nc. Un email récapitulatif doit être envoyé aux invités.",
    maxPoints: 1,
    condition: "Contrôle visuel de l'auditeur",
    inputType: "boolean",
  },
  {
    id: 6,
    title: "No Show",
    description: "Tous les inscrits participent à la rencontre.",
    maxPoints: 1,
    condition: "Contrôle visuel de l'auditeur",
    inputType: "boolean",
  },
  {
    id: 7,
    title: "Plan de table",
    description: "Le plan de table est préparé pour l'événement audité.",
    maxPoints: 1,
    condition: "Contrôle visuel de l'auditeur",
    inputType: "boolean",
  },
  {
    id: 8,
    title: "Outils sur place",
    description: "L'ensemble des outils Dynabuy sont présents et installés sur le lieu de l'événement.",
    maxPoints: 18,
    condition: "Contrôle visuel de l'auditeur\n1 point par élément présent",
    inputType: "checklist",
    checklistItems: [
      "Ordinateur, micro, sono, zapette, écran, rallonges",
      "La présentation officielle (PPT)",
      "Le logiciel Dynamatch",
      "Table & nappe d'accueil Dynabuy",
      "60 Tours de cou (30 rouges & 30 blancs)",
      "Les 100 numéros Dynamatch plastifiés",
      "Roll-up Bienvenue",
      "Roll-up Dynabuy Avantages",
      "Roll-up Club d'Affaires",
      "Oriflamme",
      "Dépliants Dynabuy Avantages & Club d'Affaires",
      "Mugs Dynabuy",
      "Stylos Dynabuy",
      "Prise de note RD Dynabuy",
      "Questionnaires",
      "Tous les totems (Tables, QRCode, Bienvenue / Au revoir, Avis)",
      "La liste des participants",
      "Le plan de table DYNAMATCH imprimé",
    ],
  },
  {
    id: 9,
    title: "Accueil",
    description: "L'agence a accueilli les participants à l'événement audité.",
    maxPoints: 1,
    condition: "Contrôle visuel de l'auditeur",
    inputType: "boolean",
  },
  {
    id: 10,
    title: "Dynamatch",
    description:
      "Dynamatch est utilisé lors de la Rencontre Dirigeants.\nDynamatch est le seul logiciel accepté.",
    maxPoints: 1,
    condition: "Contrôle visuel de l'auditeur",
    inputType: "boolean",
  },
  {
    id: 11,
    title: 'Présentation "Dynabuy" officielle',
    description:
      "La présentation et le script officiel sont utilisés lors de la réunion.\nPersonnalisation possible en respectant la charte graphique :\n- Le programme\n- Le lieu\n- Les dates de vos RD\n- Le carousel des exemples tarifaires\n- Des comparatifs de factures\n- Les offres locales\n- La mise à l'honneur\n- Vos clubs d'affaires\n- Les témoignages adhérents",
    maxPoints: 1,
    condition: "Contrôle visuel de l'auditeur",
    inputType: "boolean",
  },
  {
    id: 12,
    title: "Mise à l'honneur",
    description: "Une mise à l'honneur est réalisée lors de la réunion.",
    maxPoints: 1,
    condition: "Contrôle visuel et auditif de l'auditeur",
    inputType: "boolean",
  },
  {
    id: 13,
    title: "Timming",
    description:
      "Le déroulé de la Rencontre Dirigeants respecte les recommandations validées par le réseau.\n- Salle prête 15 minutes avant l'heure\n- Les temps fort de l'ordre du jour\n- Réunion commencée et finie à l'heure",
    maxPoints: 1,
    condition: "Tous les critères mentionnés doivent être réunis.",
    inputType: "boolean",
  },
  {
    id: 14,
    title: "RD Homologues",
    description: "L'agence fait la promotion de ses RD et des agences autour.",
    maxPoints: 1,
    condition: "Contrôle visuel et auditif de l'auditeur",
    inputType: "boolean",
  },
  {
    id: 15,
    title: "Prises de rendez-vous",
    description: "Les rendez-vous sont pris avant, pendant et à la fin de la RD.",
    maxPoints: 10,
    condition:
      "Contrôle de l'auditeur à la fin de l'événement\n1 point par rendez-vous\n10 points sont attendus sur cet item au maximum.",
    scoringRules: "1 point par rendez-vous (max 10 pts)",
    inputType: "number",
  },
  {
    id: 16,
    title: "Collecte d'avis",
    description: "Les avis sont expliqués et demandés explicitement.",
    maxPoints: 1,
    condition: "Contrôle visuel et auditif de l'auditeur",
    inputType: "boolean",
  },
  {
    id: 17,
    title: "Programmation",
    description:
      'L\'agence doit avoir 10 Rencontres Dirigeants "Présentiels" programmées sur les 12 prochains mois.',
    maxPoints: 1,
    condition: "Contrôle visuel de l'auditeur sur rencontres-dirigeants.fr",
    inputType: "boolean",
  },
  {
    id: 18,
    title: "Annulation",
    description: "L'agence a maintenu ses événements sur les 6 derniers mois.",
    maxPoints: 1,
    condition: "Déclaratif de l'agence à l'auditeur",
    inputType: "boolean",
  },
];

/** Calculate score for item 3 (participants) */
export function calcParticipantsScore(nb: number): number {
  if (nb >= 30) return 10;
  if (nb >= 26) return 5;
  if (nb >= 20) return 3;
  if (nb >= 10) return 1;
  return 0;
}

/** Calculate score for item 4 (invités) - 1pt per invité, max 10 */
export function calcInvitesScore(nb: number): number {
  return Math.min(nb, 10);
}

/** Calculate score for item 15 (RDV) - 1pt per RDV, max 10 */
export function calcRdvScore(nb: number): number {
  return Math.min(nb, 10);
}

export const MAX_TOTAL_POINTS = AUDIT_ITEMS.reduce((s, i) => s + i.maxPoints, 0); // 62
