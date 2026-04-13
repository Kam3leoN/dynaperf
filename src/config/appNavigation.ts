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
  faGear,
  faUser,
  faKey,
  faMoneyBill,
  faBell,
  faQrcode,
  faList,
  faShapes,
  faChartColumn,
  faImages,
  faPalette,
  faIcons,
  faEnvelope,
  faCubes,
  faDatabase,
  faCircleDot,
  faVideo,
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
  /** Clé `app_modules` ; absente si le module est désactivé. */
  requiredModule?: string;
  /** Absente du rail vertical (lg) ; reste dans getRailSections pour mobile / résolution d’URL. */
  hideFromRail?: boolean;
}

export interface SecondaryNavItem {
  label: string;
  to: string;
  icon: IconDefinition;
  requiredPermission?: string;
  /** Masqué si le module applicatif n’est pas activé pour l’utilisateur (ex. primes). */
  requiredModule?: string;
  /** Masqué sauf pour le rôle `super_admin`. */
  requiredSuperAdmin?: boolean;
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
    { label: "Créer un QrCode", to: "/qrcodes/new", icon: faPlus, requiredModule: "qrcode" },
    { label: "Gérer les QrCode", to: "/qrcodes", icon: faList, requiredModule: "qrcode" },
    { label: "Consulter les statistiques", to: "/qrcodes/stats", icon: faChartColumn, requiredModule: "qrcode" },
    { label: "Notifications", to: "/notifications", icon: faBell },
  ],
  /** Raccourci maison retiré du rail : le logo en bandeau joue le rôle d’accueil. */
  hideFromRail: true,
};

const messagerie: RailSection = {
  id: "messages",
  label: "Messages",
  icon: faComment,
  requiredModule: "discussions",
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
  requiredModule: "audits",
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
  requiredModule: "suivi",
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
  requiredModule: "reseau",
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
  requiredModule: "drive",
  pathPrefixes: ["/drive"],
  children: [{ label: "Mon Drive", to: "/drive", icon: faFolder }],
};

const galerie: RailSection = {
  id: "galerie",
  label: "Galerie",
  icon: faImages,
  to: "/galerie",
  /** Aligné sur la route `/galerie` : même droit que les audits (pas de module `galerie` séparé). */
  requiredPermission: "nav.audits",
  pathPrefixes: ["/galerie"],
  children: [{ label: "Galerie photos", to: "/galerie", icon: faImages }],
};

const qrcodes: RailSection = {
  id: "qrcodes",
  label: "QrCode",
  icon: faQrcode,
  to: "/qrcodes",
  requiredPermission: "nav.hub",
  requiredModule: "qrcode",
  pathPrefixes: ["/qrcodes"],
  children: [
    { label: "Créer un QrCode", to: "/qrcodes/new", icon: faPlus },
    { label: "Gérer les QrCode", to: "/qrcodes", icon: faList },
    { label: "Consulter les statistiques", to: "/qrcodes/stats", icon: faChartColumn },
  ],
};

const visio: RailSection = {
  id: "visio",
  label: "Visio",
  icon: faVideo,
  to: "/meet",
  requiredPermission: "nav.hub",
  pathPrefixes: ["/meet"],
  children: [
    { label: "Dyna'Meet", to: "/meet", icon: faVideo },
    { label: "Paramétrer une visio", to: "/meet/settings", icon: faGear },
    { label: "Gérer les visios pré-réglées", to: "/meet/presets", icon: faList },
  ],
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
  to: "/admin/users",
  pathPrefixes: ["/admin"],
  requireAdmin: true,
  requiredPermission: "nav.admin",
  children: [
    { label: "Sauvegardes", to: "/admin/backups", icon: faDatabase, requiredSuperAdmin: true },
    { label: "Utilisateurs", to: "/admin/users", icon: faUsers },
    { label: "Modules", to: "/admin/modules", icon: faCubes },
    { label: "Audits", to: "/admin/audits-config", icon: faClipboardList },
    { label: "Secteurs", to: "/admin/secteurs", icon: faMapLocationDot },
    { label: "Primes par utilisateur", to: "/admin/primes-users", icon: faMoneyBill, requiredModule: "primes" },
    { label: "Identité", to: "/admin/branding", icon: faPalette },
    { label: "Rôles & droits", to: "/admin/roles", icon: faKey },
    { label: "Expression", to: "/admin/expression", icon: faIcons },
    { label: "Invitations", to: "/admin/invitations", icon: faEnvelope },
    { label: "Formes QR", to: "/admin/qr-shapes", icon: faShapes },
    { label: "Statuts présence", to: "/admin/presence-statuses", icon: faCircleDot },
  ],
};

const ALL_RAIL_SECTIONS: RailSection[] = [
  home,
  messagerie,
  audits,
  suivis,
  reseau,
  drive,
  galerie,
  qrcodes,
  visio,
  sondages,
  historique,
  admin,
];

/** Registre complet (résolution d’URL / section active) — indépendant des droits d’affichage. */
export const RAIL_SECTIONS_ALL: RailSection[] = ALL_RAIL_SECTIONS;

/**
 * Sections du rail filtrées (admin + permissions + modules).
 * @param hasPermission - si absent, toutes les permissions sont considérées accordées (repli).
 * @param isModuleEnabled - si absent, tous les modules sont considérés actifs (repli).
 */
export function getRailSections(
  isAdmin: boolean,
  hasPermission?: (key: string) => boolean,
  isModuleEnabled?: (key: string) => boolean,
): RailSection[] {
  const can = hasPermission ?? (() => true);
  const modOn = isModuleEnabled ?? (() => true);
  return ALL_RAIL_SECTIONS.filter((s) => {
    if (s.requireAdmin && !isAdmin) return false;
    if (s.requiredPermission && !can(s.requiredPermission)) return false;
    if (s.requiredModule && !modOn(s.requiredModule)) return false;
    return true;
  });
}

/**
 * Section épinglée en tête du rail (icône NavLink). `null` = bande réservée au logo marque.
 */
export const RAIL_PINNED_TOP_SECTION_ID: string | null = null;

/** Sections du rail sous la bande logo (toutes les entrées quand rien n’est épinglé). */
export function getRailScrollSections(isAdmin: boolean, hasPermission?: (key: string) => boolean, isModuleEnabled?: (key: string) => boolean): RailSection[] {
  const list = getRailSections(isAdmin, hasPermission, isModuleEnabled).filter((s) => !s.hideFromRail);
  if (!RAIL_PINNED_TOP_SECTION_ID) return list;
  return list.filter((s) => s.id !== RAIL_PINNED_TOP_SECTION_ID);
}

/** Filtre les liens secondaires selon les permissions. */
export function filterSecondaryNavItems(
  items: SecondaryNavItem[],
  hasPermission?: (key: string) => boolean,
  isModuleEnabled?: (key: string) => boolean,
  options?: { isSuperAdmin?: boolean },
): SecondaryNavItem[] {
  const can = hasPermission ?? (() => true);
  const mod = isModuleEnabled ?? (() => true);
  const superOk = options?.isSuperAdmin === true;
  return items.filter((item) => {
    if (item.requiredSuperAdmin && !superOk) return false;
    if (item.requiredPermission && !can(item.requiredPermission)) return false;
    if (item.requiredModule && !mod(item.requiredModule)) return false;
    return true;
  });
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
  if (active.id === "home" || active.id === "admin" || active.id === "qrcodes" || active.id === "visio") {
    const normalized = pathname.split("?")[0];
    for (const c of active.children) {
      const base = c.to.split("?")[0];
      if (normalized === base || normalized.startsWith(`${base}/`)) {
        return c.label;
      }
    }
  }
  return active.label;
}
