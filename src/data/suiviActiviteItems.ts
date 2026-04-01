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

export async function fetchSuiviItemsConfig(): Promise<SuiviItemConfig[]> {
  const { data, error } = await supabase
    .from("suivi_activite_items_config")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) {
    console.error("Error fetching suivi items config:", error);
    return [];
  }
  return data as SuiviItemConfig[];
}
