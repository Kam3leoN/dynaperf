/** Ordre par défaut si le catalogue n’est pas encore chargé (sort_rank décroissant). */
export const DEFAULT_ROLE_PRIORITY_FALLBACK = [
  "super_admin",
  "admin",
  "super_moderator",
  "moderator",
  "bot",
  "member",
] as const;

function humanizeRoleKey(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Déduit le rôle d’annuaire à partir des lignes user_roles (plus haute priorité = premier dans `priorityOrder`).
 */
export function primaryRoleFromRoles(roles: string[], priorityOrder: string[]): string {
  const norm = roles.map((r) =>
    r === "user" || r === "lecteur" || r === "redacteur" ? "member" : r,
  );
  for (const r of priorityOrder) {
    if (norm.includes(r)) return r;
  }
  for (const r of DEFAULT_ROLE_PRIORITY_FALLBACK) {
    if (norm.includes(r)) return r;
  }
  return norm[0] ?? "member";
}

/** Titre de section annuaire (libellé catalogue ou clé lisible). */
export function sectionTitleForRole(roleKey: string, labels: Record<string, string> | undefined): string {
  return labels?.[roleKey] ?? humanizeRoleKey(roleKey);
}

/** Labels FR pour les titres organisationnels (enum `org_title`). */
export const ORG_TITLE_LABELS: Record<string, string> = {
  owner: "Owner",
  boss: "Boss",
  director_general: "Dir. Co.",
  external_executive: "Cadre Ext.",
  agency: "Agence",
  president: "Président",
};
