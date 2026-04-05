import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faHouse,
  faComment,
  faClipboardList,
  faListCheck,
  faHandshake,
  faFolder,
  faSquarePollVertical,
  faClockRotateLeft,
  faUserShield,
  faChartLine,
  faPlus,
  faEye,
  faUsers,
  faBriefcase,
  faMapLocationDot,
  faCalendarPlus,
  faTableCells,
  faGear,
  faUser,
  faKey,
  faMoneyBill,
  faBell,
} from "@fortawesome/free-solid-svg-icons";

/** Entrée du rail (icône seule). */
export interface RailSection {
  id: string;
  label: string;
  icon: IconDefinition;
  /** Route principale (clic rail). */
  to: string;
  /** Préfixes pour état actif (pathname.startsWith). */
  pathPrefixes: string[];
  /** Sous-liens dans la colonne secondaire (~280px). */
  children: SecondaryNavItem[];
  /** Masquée si non admin. */
  requireAdmin?: boolean;
}

export interface SecondaryNavItem {
  label: string;
  to: string;
  icon: IconDefinition;
}

const home: RailSection = {
  id: "home",
  label: "Accueil",
  icon: faHouse,
  to: "/",
  /** Inclut compte / préférences pour que la colonne secondaire (logo + liens) reste visible. */
  pathPrefixes: [
    "/hub",
    "/preferences",
    "/profile",
    "/change-password",
    "/primes",
    "/notifications",
  ],
  children: [
    { label: "Hub", to: "/hub", icon: faChartLine },
    { label: "Tableau de bord audits", to: "/dashboard", icon: faClipboardList },
    { label: "Préférences", to: "/preferences", icon: faGear },
    { label: "Profil", to: "/profile", icon: faUser },
    { label: "Mot de passe", to: "/change-password", icon: faKey },
    { label: "Mes primes", to: "/primes", icon: faMoneyBill },
    { label: "Notifications", to: "/notifications", icon: faBell },
  ],
};

const messagerie: RailSection = {
  id: "messages",
  label: "Messagerie",
  icon: faComment,
  to: "/messages",
  pathPrefixes: ["/messages"],
  children: [],
};

const audits: RailSection = {
  id: "audits",
  label: "Audits",
  icon: faClipboardList,
  to: "/dashboard",
  pathPrefixes: ["/dashboard", "/audits"],
  children: [
    { label: "Tableau de bord", to: "/dashboard", icon: faChartLine },
    { label: "Tous les audits", to: "/audits", icon: faClipboardList },
    { label: "Nouvel audit", to: "/audits/new", icon: faPlus },
    { label: "Planifier un audit", to: "/audits?plan=1", icon: faCalendarPlus },
  ],
};

const suivis: RailSection = {
  id: "activite",
  label: "Suivis",
  icon: faListCheck,
  to: "/activite/dashboard",
  pathPrefixes: ["/activite"],
  children: [
    { label: "Tableau de bord", to: "/activite/dashboard", icon: faChartLine },
    { label: "Tous les suivis", to: "/activite", icon: faEye },
    { label: "Nouveau suivi", to: "/activite/new/version", icon: faPlus },
    { label: "Planifier un suivi", to: "/activite?plan=1", icon: faCalendarPlus },
  ],
};

const reseau: RailSection = {
  id: "reseau",
  label: "Réseau",
  icon: faHandshake,
  to: "/reseau/partenaires",
  pathPrefixes: ["/reseau", "/business-plan"],
  children: [
    { label: "Partenaires", to: "/reseau/partenaires", icon: faUsers },
    { label: "Clubs d'affaires", to: "/reseau/clubs", icon: faBriefcase },
    { label: "Secteurs / Zones", to: "/reseau/secteurs", icon: faMapLocationDot },
    { label: "Business Plan", to: "/business-plan", icon: faChartLine },
  ],
};

const drive: RailSection = {
  id: "drive",
  label: "Drive",
  icon: faFolder,
  to: "/drive",
  pathPrefixes: ["/drive"],
  children: [{ label: "Mon Drive", to: "/drive", icon: faFolder }],
};

const sondages: RailSection = {
  id: "sondages",
  label: "Sondages",
  icon: faSquarePollVertical,
  to: "/sondages",
  pathPrefixes: ["/sondages"],
  children: [{ label: "Sondages", to: "/sondages", icon: faSquarePollVertical }],
};

const historique: RailSection = {
  id: "historique",
  label: "Historique",
  icon: faClockRotateLeft,
  to: "/historique",
  pathPrefixes: ["/historique"],
  children: [{ label: "Historique", to: "/historique", icon: faClockRotateLeft }],
};

const admin: RailSection = {
  id: "admin",
  label: "Admin",
  icon: faUserShield,
  to: "/admin",
  pathPrefixes: ["/admin"],
  requireAdmin: true,
  children: [
    { label: "Administration", to: "/admin", icon: faUserShield },
    { label: "Grille audits", to: "/admin/audit-grid", icon: faTableCells },
  ],
};

const ALL_RAIL_SECTIONS: RailSection[] = [
  messagerie,
  home,
  audits,
  suivis,
  reseau,
  drive,
  sondages,
  historique,
  admin,
];

/**
 * Sections du rail filtrées (admin). L’ordre est personnalisable plus tard via localStorage.
 */
export function getRailSections(isAdmin: boolean): RailSection[] {
  return ALL_RAIL_SECTIONS.filter((s) => !s.requireAdmin || isAdmin);
}

/** Section épinglée en tête du rail (hauteur = bande logo, au-dessus du défilement). */
export const RAIL_PINNED_TOP_SECTION_ID = "messages";

/** Sections du rail qui défilent sous la zone fixe (sans la messagerie). */
export function getRailScrollSections(isAdmin: boolean): RailSection[] {
  return getRailSections(isAdmin).filter((s) => s.id !== RAIL_PINNED_TOP_SECTION_ID);
}

/**
 * Résout la section active pour le pathname (plus long préfixe gagnant, hors / exact).
 */
export function getActiveRailSection(pathname: string, sections: RailSection[]): RailSection | null {
  if (pathname === "/") {
    return sections.find((s) => s.id === "home") ?? null;
  }
  let best: RailSection | null = null;
  let bestLen = -1;
  for (const s of sections) {
    for (const p of s.pathPrefixes) {
      if (p === "/") continue;
      if (pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")) {
        if (p.length > bestLen) {
          bestLen = p.length;
          best = s;
        }
      }
    }
  }
  return best;
}
