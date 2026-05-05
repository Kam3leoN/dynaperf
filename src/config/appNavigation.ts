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
  faLayerGroup,
  faBook,
} from "@fortawesome/free-solid-svg-icons";

/** Hub « vue d’ensemble » (Material 3 Expressive : clic rail → page de cartes, pas le 1er sous-lien). */
export function navHubPath(sectionId: string): string {
  return `/nav/${sectionId}`;
}

/** Clic rail « Admin » : hub vue d’ensemble (cartes), toujours `/nav/admin`. */
export const ADMIN_RAIL_NAV_DESTINATION = navHubPath("admin");

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
  /** Masqué si le module applicatif n’est pas activé pour l’utilisateur. */
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
    "/notifications",
  ],
  children: [
    { label: "Hub", to: "/hub", icon: faChartLine },
    { label: "Tableau de bord audits", to: "/dashboard", icon: faClipboardList, requiredPermission: "nav.audits" },
    { label: "Préférences", to: "/preferences", icon: faGear },
    { label: "Profil", to: "/profile", icon: faUser },
    { label: "Mot de passe", to: "/change-password", icon: faKey },
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
  to: navHubPath("audits"),
  requiredPermission: "nav.audits",
  requiredModule: "audits",
  pathPrefixes: ["/nav/audits", "/dashboard", "/audits"],
  children: [
    { label: "Vue d'ensemble", to: navHubPath("audits"), icon: faLayerGroup },
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
  to: navHubPath("activite"),
  requiredPermission: "nav.activite",
  requiredModule: "suivi",
  pathPrefixes: ["/nav/activite", "/activite"],
  children: [
    { label: "Vue d'ensemble", to: navHubPath("activite"), icon: faLayerGroup },
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
  to: navHubPath("reseau"),
  requiredPermission: "nav.reseau",
  requiredModule: "reseau",
  pathPrefixes: ["/nav/reseau", "/reseau", "/business-plan"],
  children: [
    { label: "Vue d'ensemble", to: navHubPath("reseau"), icon: faLayerGroup },
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
  to: navHubPath("drive"),
  requiredPermission: "nav.drive",
  requiredModule: "drive",
  pathPrefixes: ["/nav/drive", "/drive"],
  children: [
    { label: "Vue d'ensemble", to: navHubPath("drive"), icon: faLayerGroup },
    { label: "Mon Drive", to: "/drive", icon: faFolder },
  ],
};

const galerie: RailSection = {
  id: "galerie",
  label: "Galerie",
  icon: faImages,
  to: navHubPath("galerie"),
  /** Aligné sur la route `/galerie` : même droit que les audits (pas de module `galerie` séparé). */
  requiredPermission: "nav.audits",
  requiredModule: "galerie",
  pathPrefixes: ["/nav/galerie", "/galerie"],
  children: [
    { label: "Vue d'ensemble", to: navHubPath("galerie"), icon: faLayerGroup },
    { label: "Galerie photos", to: "/galerie", icon: faImages },
  ],
};

const qrcodes: RailSection = {
  id: "qrcodes",
  label: "QrCode",
  icon: faQrcode,
  to: navHubPath("qrcodes"),
  requiredPermission: "nav.hub",
  requiredModule: "qrcode",
  pathPrefixes: ["/nav/qrcodes", "/qrcodes"],
  children: [
    { label: "Vue d'ensemble", to: navHubPath("qrcodes"), icon: faLayerGroup },
    { label: "Créer un QrCode", to: "/qrcodes/new", icon: faPlus },
    { label: "Gérer les QrCode", to: "/qrcodes", icon: faList },
    { label: "Consulter les statistiques", to: "/qrcodes/stats", icon: faChartColumn },
  ],
};

const visio: RailSection = {
  id: "visio",
  label: "Visio",
  icon: faVideo,
  to: navHubPath("visio"),
  requiredPermission: "nav.hub",
  requiredModule: "visio",
  pathPrefixes: ["/nav/visio", "/meet"],
  children: [
    { label: "Vue d'ensemble", to: navHubPath("visio"), icon: faLayerGroup },
    { label: "Dyna'Meet", to: "/meet", icon: faVideo },
    { label: "Paramétrer une visio", to: "/meet/settings", icon: faGear },
  ],
};

const sondages: RailSection = {
  id: "sondages",
  label: "Sondages",
  icon: faSquarePollVertical,
  to: navHubPath("sondages"),
  requiredModule: "sondages",
  requiredPermission: "nav.sondages",
  pathPrefixes: ["/nav/sondages", "/sondages"],
  children: [
    { label: "Vue d'ensemble", to: navHubPath("sondages"), icon: faLayerGroup },
    { label: "Sondages", to: "/sondages", icon: faSquarePollVertical },
  ],
};

const admin: RailSection = {
  id: "admin",
  label: "Admin",
  icon: faUserShield,
  to: ADMIN_RAIL_NAV_DESTINATION,
  pathPrefixes: ["/nav/admin", "/admin"],
  /** Entrée déplacée vers le menu du bouton profil (split avatar dock / header). */
  hideFromRail: true,
  requireAdmin: true,
  requiredPermission: "nav.admin",
  children: [
    { label: "Vue d'ensemble", to: ADMIN_RAIL_NAV_DESTINATION, icon: faLayerGroup },
    { label: "Sauvegardes", to: "/admin/backups", icon: faDatabase, requiredSuperAdmin: true },
    { label: "Barèmes primes", to: "/admin/primes/overview", icon: faBook, requiredSuperAdmin: true },
    { label: "Suivi primes", to: "/admin/primes/suivi", icon: faChartLine, requiredSuperAdmin: true },
    { label: "Utilisateurs", to: "/admin/users", icon: faUsers },
    { label: "Modules", to: "/admin/modules", icon: faCubes },
    { label: "Audits", to: "/admin/audits-config", icon: faClipboardList },
    { label: "Secteurs", to: "/admin/secteurs", icon: faMapLocationDot },
    { label: "Identité", to: "/admin/branding", icon: faPalette },
    { label: "Rôles & droits", to: "/admin/roles", icon: faKey },
    { label: "Expression", to: "/admin/expression", icon: faIcons },
    { label: "Invitations", to: "/admin/invitations", icon: faEnvelope },
    { label: "Formes QR", to: "/admin/qr-shapes", icon: faShapes },
    { label: "Statuts présence", to: "/admin/presence-statuses", icon: faCircleDot },
    { label: "Historique d'activité", to: "/admin/historique", icon: faClockRotateLeft, requiredPermission: "nav.historique" },
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
    if (s.requiredModule && !modOn(s.requiredModule)) return false;
    // Mode "switch unique" : pour une section liée à un module,
    // la visibilité dépend uniquement du module utilisateur.
    if (!s.requiredModule && s.requiredPermission && !can(s.requiredPermission)) return false;
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
    if (item.requiredModule && !mod(item.requiredModule)) return false;
    if (!item.requiredModule && item.requiredPermission && !can(item.requiredPermission)) return false;
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
 * Titre affiché dans le header : libellé du sous-menu dont l’URL correspond (le plus long préfixe gagne).
 */
export function getRailHeaderLabel(pathname: string, sections: RailSection[]): string | null {
  const active = getActiveRailSection(pathname, sections);
  if (!active) return null;
  const normalized = pathname.split("?")[0];
  const withBases = active.children.map((c) => ({ ...c, base: c.to.split("?")[0] }));
  const exact = withBases.find((x) => normalized === x.base);
  if (exact) return exact.label;
  const sorted = [...withBases].sort((a, b) => b.base.length - a.base.length);
  for (const c of sorted) {
    if (c.base.length <= 1) continue;
    if (normalized.startsWith(`${c.base}/`)) {
      return c.label;
    }
  }
  return active.label;
}

/** Lien affiché dans le bloc Précédent / À suivre (style documentation Material). */
export interface DocNavLink {
  label: string;
  to: string;
}

/**
 * Index de l’entrée du sous-menu (liste filtrée) correspondant au chemin courant.
 * Même logique que {@link getRailHeaderLabel} mais sur les items déjà filtrés.
 */
export function getCurrentFilteredSecondaryNavIndex(pathname: string, items: SecondaryNavItem[]): number {
  if (items.length === 0) return -1;
  const normalized = pathname.split("?")[0];
  const withBases = items.map((c, idx) => ({ c, idx, base: c.to.split("?")[0] }));
  const exact = withBases.find((x) => normalized === x.base);
  if (exact) return exact.idx;
  const sorted = [...withBases].sort((a, b) => b.base.length - a.base.length);
  for (const x of sorted) {
    if (x.base.length <= 1) continue;
    if (normalized.startsWith(`${x.base}/`)) {
      return x.idx;
    }
  }
  return -1;
}

/**
 * Voisins Précédent / Suivant dans l’ordre du sous-menu de la section active.
 * `null` si la page n’est pas dans la liste (ou Accueil `/` uniquement).
 */
export function getDocNavNeighbors(
  pathname: string,
  sections: RailSection[],
  opts: {
    hasPermission: (key: string) => boolean;
    isModuleEnabled: (key: string) => boolean;
    isSuperAdmin: boolean;
  },
): { prev: DocNavLink | null; next: DocNavLink | null } | null {
  if (pathname === "/") return null;

  const active = getActiveRailSection(pathname, sections);
  if (!active || active.children.length === 0) return null;

  const items = filterSecondaryNavItems(active.children, opts.hasPermission, opts.isModuleEnabled, {
    isSuperAdmin: opts.isSuperAdmin,
  });
  if (items.length === 0) return null;

  const idx = getCurrentFilteredSecondaryNavIndex(pathname, items);
  if (idx < 0) return null;

  const prev = idx > 0 ? { label: items[idx - 1]!.label, to: items[idx - 1]!.to } : null;
  const next = idx < items.length - 1 ? { label: items[idx + 1]!.label, to: items[idx + 1]!.to } : null;

  if (!prev && !next) return null;
  return { prev, next };
}
