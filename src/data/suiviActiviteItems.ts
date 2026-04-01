import { supabase } from "@/integrations/supabase/client";

export interface SuiviItemConfig {
  id: string;
  categorie: string;
  numero: number;
  titre: string;
  conditions: string;
  interets: string;
  conseils: string;
  sort_order: number;
}

export async function fetchSuiviItemsConfig(version?: number): Promise<SuiviItemConfig[]> {
  let query = supabase
    .from("suivi_activite_items_config")
    .select("*")
    .order("sort_order");
  
  if (version !== undefined) {
    query = query.eq("config_version", version);
  } else {
    query = query.eq("is_active", true);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching suivi items config:", error);
    return [];
  }
  return data as SuiviItemConfig[];
}
