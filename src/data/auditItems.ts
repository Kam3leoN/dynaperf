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
  checklistPointsMap?: number[];
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

  const safeCats = cats || [];

  // 3. Get items for all categories
  const catIds = safeCats.map((c) => c.id);
  const { data: items } = await supabase
    .from("audit_items_config")
    .select("*")
    .in("category_id", catIds)
    .order("sort_order");

  const categories: AuditCategoryDef[] = safeCats.map((c) => ({
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
        autoField: (i as Record<string, unknown>).auto_field as string | undefined ?? undefined,
        interets: (i as Record<string, unknown>).interets as string | undefined ?? undefined,
        commentYParvenir: (i as Record<string, unknown>).comment_y_parvenir as string | undefined ?? undefined,
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

  const safeCats = cats || [];

  const catIds = safeCats.map((c) => c.id);
  const { data: items } = await supabase
    .from("audit_items_config")
    .select("*")
    .in("category_id", catIds)
    .order("sort_order");

  const categories: AuditCategoryDef[] = safeCats.map((c) => ({
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
        autoField: (i as Record<string, unknown>).auto_field as string | undefined ?? undefined,
        interets: (i as Record<string, unknown>).interets as string | undefined ?? undefined,
        commentYParvenir: (i as Record<string, unknown>).comment_y_parvenir as string | undefined ?? undefined,
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
export interface ScoringTier {
  min: number;
  max: number | null;
  points: number;
}

export function parseScoringTiers(scoringRules: string | null | undefined): ScoringTier[] | null {
  if (!scoringRules) return null;
  try {
    const parsed = JSON.parse(scoringRules);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].points === "number") {
      return parsed as ScoringTier[];
    }
  } catch {
    // Not JSON — legacy text
  }
  return null;
}

export interface IncrementConfig {
  type: "increment";
  minValue: number;
  step: number;
}

export interface ThresholdConfig {
  type: "threshold";
  operator: "lt" | "lte" | "eq" | "gt" | "gte";
  value: number;
}

export function parseIncrementConfig(scoringRules: string | null | undefined): IncrementConfig | null {
  if (!scoringRules) return null;
  try {
    const parsed = JSON.parse(scoringRules);
    if (parsed && parsed.type === "increment") return parsed as IncrementConfig;
  } catch {
    /* JSON invalide */
  }
  return null;
}

export function calcIncrementScore(value: number, config: IncrementConfig, maxPoints: number): number {
  if (value < config.minValue) return 0;
  const score = Math.floor(value / config.step);
  return Math.min(score, maxPoints);
}

export function parseThresholdConfig(scoringRules: string | null | undefined): ThresholdConfig | null {
  if (!scoringRules) return null;
  try {
    const parsed = JSON.parse(scoringRules);
    if (parsed && parsed.type === "threshold") return parsed as ThresholdConfig;
  } catch {
    /* JSON invalide */
  }
  return null;
}

export function calcThresholdScore(value: number, config: ThresholdConfig, maxPoints: number): number {
  switch (config.operator) {
    case "lt": return value < config.value ? maxPoints : 0;
    case "lte": return value <= config.value ? maxPoints : 0;
    case "eq": return value === config.value ? maxPoints : 0;
    case "gt": return value > config.value ? maxPoints : 0;
    case "gte": return value >= config.value ? maxPoints : 0;
    default: return 0;
  }
}

export function formatThresholdDisplay(config: ThresholdConfig, maxPoints: number): string {
  const opLabel = { lt: "<", lte: "≤", eq: "=", gt: ">", gte: "≥" }[config.operator];
  return `Valeur ${opLabel} ${config.value} → ${maxPoints} pts, sinon 0 pt`;
}

export function calcTiersScore(value: number, tiers: ScoringTier[]): number {
  const sorted = [...tiers].sort((a, b) => b.min - a.min);
  for (const tier of sorted) {
    if (value >= tier.min && (tier.max === null || value <= tier.max)) {
      return tier.points;
    }
  }
  return 0;
}

export function formatTiersDisplay(tiers: ScoringTier[]): string {
  return tiers
    .sort((a, b) => a.min - b.min)
    .map((t) =>
      t.max === null
        ? `Plus de ${t.min - 1} → ${t.points} pts`
        : `${t.min} à ${t.max} → ${t.points} pts`
    )
    .join("\n");
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
