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
  faQrcode,
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
  /** Clé `app_permissions` (ex. nav.audits) ; absente du menu si refusé. */
  requiredPermission?: string;
  /** Absente du rail vertical (lg) ; reste dans getRailSections pour mobile / résolution d’URL. */
  hideFromRail?: boolean;
}

export interface SecondaryNavItem {
  label: string;
  to: string;
  icon: IconDefinition;
  requiredPermission?: string;
}

const home: RailSection = {
  id: "home",
  label: "Accueil",
  icon: faHouse,
  to: "/",
  requiredPermission: "nav.hub",
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
    { label: "Tableau de bord audits", to: "/dashboard", icon: faClipboardList, requiredPermission: "nav.audits" },
    { label: "Préférences", to: "/preferences", icon: faGear },
    { label: "Profil", to: "/profile", icon: faUser },
    { label: "Mot de passe", to: "/change-password", icon: faKey },
    { label: "Mes primes", to: "/primes", icon: faMoneyBill },
    { label: "Gestion QrCode", to: "/qrcodes", icon: faQrcode },
    { label: "Notifications", to: "/notifications", icon: faBell },
  ],
  /** Raccourci maison retiré du rail : le logo en bandeau joue le rôle d’accueil. */
  hideFromRail: true,
};

const messagerie: RailSection = {
  id: "messages",
  label: "Messages",
  icon: faComment,
  to: "/messages?section=discussion",
  pathPrefixes: ["/messages"],
  children: [],
  requiredPermission: "nav.messages",
  hideFromRail: true,
};

const audits: RailSection = {
  id: "audits",
  label: "Audits",
  icon: faClipboardList,
  to: "/dashboard",
  requiredPermission: "nav.audits",
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
  requiredPermission: "nav.activite",
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
  requiredPermission: "nav.reseau",
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
  requiredPermission: "nav.drive",
  pathPrefixes: ["/drive"],
  children: [{ label: "Mon Drive", to: "/drive", icon: faFolder }],
};

const qrcodes: RailSection = {
  id: "qrcodes",
  label: "QrCode",
  icon: faQrcode,
  to: "/qrcodes",
  requiredPermission: "nav.hub",
  pathPrefixes: ["/qrcodes"],
  children: [{ label: "Gestion QrCode", to: "/qrcodes", icon: faQrcode }],
};

const sondages: RailSection = {
  id: "sondages",
  label: "Sondages",
  icon: faSquarePollVertical,
  to: "/sondages",
  requiredPermission: "nav.sondages",
  pathPrefixes: ["/sondages"],
  children: [{ label: "Sondages", to: "/sondages", icon: faSquarePollVertical }],
};

const historique: RailSection = {
  id: "historique",
  label: "Historique",
  icon: faClockRotateLeft,
  to: "/historique",
  requiredPermission: "nav.historique",
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
  requiredPermission: "nav.admin",
  children: [
    { label: "Administration", to: "/admin", icon: faUserShield },
    { label: "Rôles & droits", to: "/admin/roles", icon: faKey },
    { label: "Grille audits", to: "/admin/audit-grid", icon: faTableCells },
  ],
};

const ALL_RAIL_SECTIONS: RailSection[] = [
  home,
  messagerie,
  audits,
  suivis,
  reseau,
  drive,
  qrcodes,
  sondages,
  historique,
  admin,
];

/** Registre complet (résolution d’URL / section active) — indépendant des droits d’affichage. */
export const RAIL_SECTIONS_ALL: RailSection[] = ALL_RAIL_SECTIONS;

/**
 * Sections du rail filtrées (admin + permissions).
 * @param hasPermission - si absent, toutes les permissions sont considérées accordées (repli).
 */
export function getRailSections(isAdmin: boolean, hasPermission?: (key: string) => boolean): RailSection[] {
  const can = hasPermission ?? (() => true);
  return ALL_RAIL_SECTIONS.filter((s) => {
    if (s.requireAdmin && !isAdmin) return false;
    if (s.requiredPermission && !can(s.requiredPermission)) return false;
    return true;
  });
}

/**
 * Section épinglée en tête du rail (icône NavLink). `null` = bande réservée au logo marque.
 */
export const RAIL_PINNED_TOP_SECTION_ID: string | null = null;

/** Sections du rail sous la bande logo (toutes les entrées quand rien n’est épinglé). */
export function getRailScrollSections(isAdmin: boolean, hasPermission?: (key: string) => boolean): RailSection[] {
  const list = getRailSections(isAdmin, hasPermission).filter((s) => !s.hideFromRail);
  if (!RAIL_PINNED_TOP_SECTION_ID) return list;
  return list.filter((s) => s.id !== RAIL_PINNED_TOP_SECTION_ID);
}

/** Filtre les liens secondaires selon les permissions. */
export function filterSecondaryNavItems(
  items: SecondaryNavItem[],
  hasPermission?: (key: string) => boolean,
): SecondaryNavItem[] {
  const can = hasPermission ?? (() => true);
  return items.filter((item) => !item.requiredPermission || can(item.requiredPermission));
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

/**
 * Titre affiché dans le header (bandeau) : pour la zone « Accueil », le libellé de la sous-page
 * (ex. Notifications, Profil) au lieu de « Accueil » lorsque l’URL correspond à une entrée du menu secondaire.
 */
export function getRailHeaderLabel(pathname: string, sections: RailSection[]): string | null {
  const active = getActiveRailSection(pathname, sections);
  if (!active) return null;
  if (active.id !== "home") return active.label;

  const normalized = pathname.split("?")[0];
  for (const c of active.children) {
    const base = c.to.split("?")[0];
    if (normalized === base || normalized.startsWith(`${base}/`)) {
      return c.label;
    }
  }
  return active.label;
}
