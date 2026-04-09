type ChecklistRuntimeShape = {
  inputType?: string;
  maxPoints?: number;
  checklistItems?: string[] | null;
  checklistPointsMap?: number[] | null;
};

type ChecklistAdminShape = {
  input_type?: string | null;
  max_points?: number | null;
  checklist_items?: unknown;
};

type ChecklistLike = ChecklistRuntimeShape | ChecklistAdminShape;

export function getChecklistStoredTotal(checklistItems: unknown): number | null {
  if (!Array.isArray(checklistItems) || checklistItems.length === 0) return null;

  const [firstItem] = checklistItems;
  if (typeof firstItem === "object" && firstItem !== null && "label" in firstItem) {
    return (checklistItems as Array<{ points?: number }>).reduce(
      (sum, item) => sum + Math.max(0, typeof item.points === "number" ? item.points : 1),
      0
    );
  }

  return checklistItems.length;
}

export function getAuditItemMaxPoints(item: ChecklistLike): number {
  const inputType = "inputType" in item ? item.inputType : item.input_type;
  const fallbackMax = "maxPoints" in item ? item.maxPoints ?? 0 : item.max_points ?? 0;

  if (inputType !== "checklist") return fallbackMax;

  if ("checklistPointsMap" in item && Array.isArray(item.checklistPointsMap) && item.checklistPointsMap.length > 0) {
    return item.checklistPointsMap.reduce((sum, points) => sum + Math.max(0, points), 0);
  }

  if ("checklistItems" in item && Array.isArray(item.checklistItems) && item.checklistItems.length > 0) {
    return item.checklistItems.length;
  }

  if ("checklist_items" in item) {
    return getChecklistStoredTotal(item.checklist_items) ?? fallbackMax;
  }

  return fallbackMax;
}