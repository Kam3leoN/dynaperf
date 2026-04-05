/** Rôle d’affichage principal (priorité décroissante, alignée sur Admin). */
export const PRIMARY_ROLE_ORDER = ["super_admin", "admin", "redacteur", "lecteur"] as const;
export type PrimaryRole = (typeof PRIMARY_ROLE_ORDER)[number];

export const PRIMARY_ROLE_SECTION_LABELS: Record<PrimaryRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  redacteur: "Rédacteurs",
  lecteur: "Membres",
};

/**
 * Déduit le rôle d’annuaire à partir des lignes user_roles (plus haute priorité).
 */
export function primaryRoleFromRoles(roles: string[]): PrimaryRole {
  const norm = roles.map((r) => (r === "user" ? "lecteur" : r));
  for (const r of PRIMARY_ROLE_ORDER) {
    if (norm.includes(r)) return r;
  }
  return "lecteur";
}
