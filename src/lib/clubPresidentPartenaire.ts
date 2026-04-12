import { supabase } from "@/integrations/supabase/client";
import { displayClubName } from "@/lib/clubDisplayName";
import { extractDepartementCode, findSecteurIdForDepartementCode } from "@/lib/departementDisplay";
import { normalizePresidentImportName } from "@/lib/personNameNormalize";

function splitPresidentName(full: string): { prenom: string; nom: string } {
  const t = normalizePresidentImportName(full).trim();
  if (!t) return { prenom: "", nom: "" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { prenom: "", nom: parts[0] ?? "" };
  return { prenom: parts.slice(0, -1).join(" "), nom: parts[parts.length - 1] ?? "" };
}

/**
 * Rattache le président du club à un partenaire (email) : met à jour un existant ou en crée un.
 * Met `president_partenaire_id` sur le club et complète `secteurs` / `is_president_club` côté partenaire.
 */
export async function syncClubPresidentPartenaire(clubId: string): Promise<void> {
  const { data: club, error: clubErr } = await supabase
    .from("clubs")
    .select(
      "id, nom, president_nom, email_president, telephone_president, agence_rattachement, secteur_id, departement",
    )
    .eq("id", clubId)
    .maybeSingle();

  if (clubErr || !club) return;

  const emailRaw = (club.email_president ?? "").trim().toLowerCase();
  if (!emailRaw) {
    await supabase.from("clubs").update({ president_partenaire_id: null }).eq("id", clubId);
    return;
  }

  const { data: secteurs } = await supabase.from("secteurs").select("id, nom, departements");

  let resolvedSecteurId = club.secteur_id ?? null;
  if (!resolvedSecteurId && club.departement && secteurs?.length) {
    const code = extractDepartementCode(club.departement);
    if (code) resolvedSecteurId = findSecteurIdForDepartementCode(code, secteurs);
  }

  const sectorNameForPartner =
    resolvedSecteurId && secteurs ? secteurs.find((s) => s.id === resolvedSecteurId)?.nom ?? null : null;

  const { data: existingList } = await supabase
    .from("partenaires")
    .select("id, secteurs")
    .ilike("email", emailRaw)
    .limit(1);

  const existing = existingList?.[0];

  const referent = (club.agence_rattachement ?? "").trim() || "Dynabuy";
  const societe = displayClubName(club.nom) || "Club";
  const { prenom, nom } = splitPresidentName(club.president_nom);
  const nomUpper = nom ? nom.toUpperCase() : "INCONNU";

  if (existing) {
    const mergedSectors = [
      ...new Set([...(existing.secteurs || []), ...(sectorNameForPartner ? [sectorNameForPartner] : [])]),
    ];
    await supabase
      .from("partenaires")
      .update({
        is_president_club: true,
        secteurs: mergedSectors,
        partenaire_referent: referent,
      })
      .eq("id", existing.id);
    await supabase.from("clubs").update({ president_partenaire_id: existing.id }).eq("id", clubId);
    return;
  }

  const { data: created, error: insErr } = await supabase
    .from("partenaires")
    .insert({
      prenom: prenom || "—",
      nom: nomUpper,
      societe,
      commission: 50,
      partenaire_referent: referent,
      statut: "actif",
      is_directeur_agence: false,
      is_president_club: true,
      is_cadre_externalise: false,
      secteurs: sectorNameForPartner ? [sectorNameForPartner] : [],
      email: emailRaw,
      telephone: (club.telephone_president ?? "").trim() || "—",
    })
    .select("id")
    .single();

  if (insErr || !created) return;

  await supabase.from("clubs").update({ president_partenaire_id: created.id }).eq("id", clubId);
}
