import { supabase } from "@/integrations/supabase/client";

export interface AuditItemDef {
  id: string;
  title: string;
  description: string;
  maxPoints: number;
  condition: string;
  inputType: "boolean" | "number" | "checklist";
  scoringRules?: string;
  checklistItems?: string[];
  sortOrder: number;
  categoryId: string;
  autoField?: string;
  interets?: string;
  commentYParvenir?: string;
}

export interface AuditCategoryDef {
  id: string;
  name: string;
  sortOrder: number;
  items: AuditItemDef[];
}

export interface AuditTypeConfig {
  id: string;
  key: string;
  label: string;
  categories: AuditCategoryDef[];
  maxPoints: number;
}

/** Fetch the full config (categories + items) for a given audit type key (latest active) */
export async function fetchAuditConfig(typeKey: string): Promise<AuditTypeConfig | null> {
  // 1. Get type
  const { data: typeRow, error: typeErr } = await supabase
    .from("audit_types")
    .select("*")
    .eq("key", typeKey)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (typeErr || !typeRow) return null;

  // 2. Get categories
  const { data: cats } = await supabase
    .from("audit_categories")
    .select("*")
    .eq("audit_type_id", typeRow.id)
    .order("sort_order");

  if (!cats || cats.length === 0) return null;

  // 3. Get items for all categories
  const catIds = cats.map((c) => c.id);
  const { data: items } = await supabase
    .from("audit_items_config")
    .select("*")
    .in("category_id", catIds)
    .order("sort_order");

  const categories: AuditCategoryDef[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
    items: (items || [])
      .filter((i) => i.category_id === c.id)
      .map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        maxPoints: i.max_points,
        condition: i.condition,
        inputType: i.input_type as "boolean" | "number" | "checklist",
        scoringRules: i.scoring_rules ?? undefined,
        checklistItems: i.checklist_items
          ? (i.checklist_items as string[])
          : undefined,
        sortOrder: i.sort_order,
        categoryId: c.id,
        autoField: (i as any).auto_field ?? undefined,
        interets: (i as any).interets ?? undefined,
        commentYParvenir: (i as any).comment_y_parvenir ?? undefined,
      })),
  }));

  const allItems = categories.flatMap((c) => c.items);
  const maxPoints = allItems.reduce((s, i) => s + i.maxPoints, 0);

  return {
    id: typeRow.id,
    key: typeRow.key,
    label: typeRow.label,
    categories,
    maxPoints,
  };
}

/** Fetch config by specific type ID (for version selection) */
export async function fetchAuditConfigById(typeId: string): Promise<AuditTypeConfig | null> {
  const { data: typeRow, error: typeErr } = await supabase
    .from("audit_types")
    .select("*")
    .eq("id", typeId)
    .maybeSingle();

  if (typeErr || !typeRow) return null;

  const { data: cats } = await supabase
    .from("audit_categories")
    .select("*")
    .eq("audit_type_id", typeRow.id)
    .order("sort_order");

  if (!cats || cats.length === 0) return null;

  const catIds = cats.map((c) => c.id);
  const { data: items } = await supabase
    .from("audit_items_config")
    .select("*")
    .in("category_id", catIds)
    .order("sort_order");

  const categories: AuditCategoryDef[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sort_order,
    items: (items || [])
      .filter((i) => i.category_id === c.id)
      .map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        maxPoints: i.max_points,
        condition: i.condition,
        inputType: i.input_type as "boolean" | "number" | "checklist",
        scoringRules: i.scoring_rules ?? undefined,
        checklistItems: i.checklist_items ? (i.checklist_items as string[]) : undefined,
        sortOrder: i.sort_order,
        categoryId: c.id,
        autoField: (i as any).auto_field ?? undefined,
        interets: (i as any).interets ?? undefined,
        commentYParvenir: (i as any).comment_y_parvenir ?? undefined,
      })),
  }));

  const allItems = categories.flatMap((c) => c.items);
  const maxPoints = allItems.reduce((s, i) => s + i.maxPoints, 0);

  return {
    id: typeRow.id,
    key: typeRow.key,
    label: typeRow.label,
    categories,
    maxPoints,
  };
}
export function calcParticipantsScore(nb: number): number {
  if (nb >= 30) return 10;
  if (nb >= 26) return 5;
  if (nb >= 20) return 3;
  if (nb >= 10) return 1;
  return 0;
}

/** 1pt per unit, max = maxPoints */
export function calcLinearScore(nb: number, max: number): number {
  return Math.min(Math.max(nb, 0), max);
}
