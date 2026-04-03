import { useEffect, useMemo, useState, type DragEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GRID_COLUMNS = 12;

export interface LayoutEditorField {
  id: string;
  field_label: string;
  sort_order: number;
  col_span: number;
  col_offset_before: number;
  col_offset_after: number;
}

export interface LayoutDraftItem {
  id: string;
  sort_order: number;
  col_span: number;
  col_offset_before: number;
  col_offset_after: number;
}

type Placement =
  | { kind: "existing"; row: number; startCol: number }
  | { kind: "between"; beforeRow: number | null; startCol: number };

interface PlacedField extends LayoutEditorField {
  row: number;
  startCol: number;
  endCol: number;
}

interface FieldLayoutEditorProps {
  fields: LayoutEditorField[];
  activeFieldId: string;
  onLayoutChange: (layout: LayoutDraftItem[]) => void;
  onSpanChange: (span: number) => void;
}

const SPAN_OPTIONS = [3, 4, 6, 8, 9, 12];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const clampSpan = (span: number) => clamp(span || 6, 1, GRID_COLUMNS);
const clampStart = (startCol: number, span: number) => clamp(startCol, 1, GRID_COLUMNS - span + 1);

const placeFields = (fields: LayoutEditorField[]): PlacedField[] => {
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);
  let row = 0;
  let cursor = 1;

  return sorted.map((field) => {
    const span = clampSpan(field.col_span);
    const before = clamp(field.col_offset_before || 0, 0, 11);
    const after = clamp(field.col_offset_after || 0, 0, 11);

    let startCol = cursor + before;
    if (startCol + span - 1 > GRID_COLUMNS) {
      row += 1;
      cursor = 1;
      startCol = clampStart(1 + before, span);
    }

    const placed: PlacedField = {
      ...field,
      col_span: span,
      row,
      startCol,
      endCol: startCol + span - 1,
    };

    cursor = startCol + span + after;
    if (cursor > GRID_COLUMNS) {
      row += 1;
      cursor = 1;
    }

    return placed;
  });
};

const groupByRow = (fields: PlacedField[]) => {
  const grouped = new Map<number, PlacedField[]>();
  fields.forEach((field) => {
    const next = grouped.get(field.row) || [];
    next.push(field);
    grouped.set(field.row, next.sort((a, b) => a.startCol - b.startCol));
  });
  return grouped;
};

const overlaps = (startCol: number, span: number, rowFields: PlacedField[]) => {
  const endCol = startCol + span - 1;
  return rowFields.some((field) => !(endCol < field.startCol || startCol > field.endCol));
};

const findNearestAvailableStart = (rowFields: PlacedField[], desiredStart: number, span: number) => {
  const candidates: number[] = [];
  for (let startCol = 1; startCol <= GRID_COLUMNS - span + 1; startCol += 1) {
    if (!overlaps(startCol, span, rowFields)) {
      candidates.push(startCol);
    }
  }

  if (candidates.length === 0) return null;

  return candidates.reduce((best, candidate) => {
    const bestDistance = Math.abs(best - desiredStart);
    const candidateDistance = Math.abs(candidate - desiredStart);

    if (candidateDistance < bestDistance) return candidate;
    if (candidateDistance === bestDistance && candidate < best) return candidate;
    return best;
  });
};

const buildInitialPlacement = (
  activeField: PlacedField | undefined,
  rowNumbers: number[]
): Placement => {
  if (activeField) {
    return { kind: "existing", row: activeField.row, startCol: activeField.startCol };
  }

  return {
    kind: "between",
    beforeRow: rowNumbers[0] ?? null,
    startCol: 1,
  };
};

const normalizePlacement = (
  placement: Placement,
  rowMap: Map<number, PlacedField[]>,
  span: number,
  rowNumbers: number[]
): Placement => {
  if (placement.kind === "between") {
    return { ...placement, startCol: clampStart(placement.startCol, span) };
  }

  const rowFields = rowMap.get(placement.row) || [];
  const startCol = findNearestAvailableStart(rowFields, placement.startCol, span);

  if (startCol !== null) {
    return { ...placement, startCol };
  }

  const nextRow = rowNumbers.find((row) => row > placement.row) ?? null;
  return { kind: "between", beforeRow: nextRow, startCol: 1 };
};

const serializeLayout = (
  otherFields: PlacedField[],
  activeField: LayoutEditorField,
  placement: Placement,
  rowNumbers: number[]
) => {
  const rowMap = groupByRow(otherFields);
  const rows: PlacedField[][] = [];
  const activePlaced: PlacedField = {
    ...activeField,
    col_span: clampSpan(activeField.col_span),
    row: 0,
    startCol: placement.startCol,
    endCol: placement.startCol + clampSpan(activeField.col_span) - 1,
  };

  if (placement.kind === "between") {
    let inserted = false;

    rowNumbers.forEach((rowNumber) => {
      if (!inserted && placement.beforeRow === rowNumber) {
        rows.push([activePlaced]);
        inserted = true;
      }
      rows.push([...(rowMap.get(rowNumber) || [])].sort((a, b) => a.startCol - b.startCol));
    });

    if (!inserted) {
      rows.push([activePlaced]);
    }
  } else {
    if (rowNumbers.length === 0) {
      rows.push([activePlaced]);
    } else {
      rowNumbers.forEach((rowNumber) => {
        const nextRow = [...(rowMap.get(rowNumber) || [])];
        if (rowNumber === placement.row) {
          nextRow.push(activePlaced);
        }
        rows.push(nextRow.sort((a, b) => a.startCol - b.startCol));
      });
    }
  }

  let sortOrder = 0;

  return rows.flatMap((rowFields) => {
    let previousEnd = 0;

    return rowFields.map<LayoutDraftItem>((field) => {
      const colSpan = clampSpan(field.col_span);
      const colOffsetBefore = Math.max(field.startCol - previousEnd - 1, 0);
      previousEnd = field.startCol + colSpan - 1;

      return {
        id: field.id,
        sort_order: sortOrder++,
        col_span: colSpan,
        col_offset_before: colOffsetBefore,
        col_offset_after: 0,
      };
    });
  });
};

const getPointerStartCol = (event: DragEvent<HTMLDivElement>, span: number) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const widthPerCol = rect.width / GRID_COLUMNS;
  const relativeX = event.clientX - rect.left;
  const startCol = Math.floor(relativeX / widthPerCol) + 1;
  return clampStart(startCol, span);
};

const blockBaseClass =
  "relative z-10 flex h-full min-h-[4.5rem] items-center gap-2 rounded-xl border px-3 py-2 text-left shadow-sm transition-all";

export function FieldLayoutEditor({
  fields,
  activeFieldId,
  onLayoutChange,
  onSpanChange,
}: FieldLayoutEditorProps) {
  const placedFields = useMemo(() => placeFields(fields), [fields]);
  const activeField = useMemo(() => fields.find((field) => field.id === activeFieldId), [fields, activeFieldId]);
  const activePlacedField = useMemo(
    () => placedFields.find((field) => field.id === activeFieldId),
    [placedFields, activeFieldId]
  );
  const otherPlacedFields = useMemo(
    () => placedFields.filter((field) => field.id !== activeFieldId),
    [placedFields, activeFieldId]
  );
  const rowMap = useMemo(() => groupByRow(otherPlacedFields), [otherPlacedFields]);
  const rowNumbers = useMemo(() => [...rowMap.keys()].sort((a, b) => a - b), [rowMap]);
  const rowNumbersKey = rowNumbers.join(",");

  const [placement, setPlacement] = useState<Placement>(() => buildInitialPlacement(activePlacedField, rowNumbers));
  const [hoverPlacement, setHoverPlacement] = useState<Placement | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setPlacement(buildInitialPlacement(activePlacedField, rowNumbers));
    setHoverPlacement(null);
    setDragging(false);
  }, [activePlacedField?.row, activePlacedField?.startCol, rowNumbersKey]);

  const activeSpan = clampSpan(activeField?.col_span || 6);
  const normalizedPlacement = useMemo(
    () => normalizePlacement(placement, rowMap, activeSpan, rowNumbers),
    [placement, rowMap, activeSpan, rowNumbersKey]
  );

  const previewPlacement = useMemo(() => {
    if (!dragging || !hoverPlacement) return normalizedPlacement;
    return normalizePlacement(hoverPlacement, rowMap, activeSpan, rowNumbers);
  }, [dragging, hoverPlacement, normalizedPlacement, rowMap, activeSpan, rowNumbersKey]);

  useEffect(() => {
    if (!activeField) return;
    onLayoutChange(serializeLayout(otherPlacedFields, activeField, normalizedPlacement, rowNumbers));
  }, [activeField, otherPlacedFields, normalizedPlacement, rowNumbersKey, onLayoutChange]);

  if (!activeField) return null;

  const renderBlock = (field: PlacedField | LayoutEditorField, isActive = false, startCol?: number) => {
    const span = clampSpan(field.col_span);
    const gridStart = startCol ?? ("startCol" in field ? field.startCol : 1);

    return (
      <div
        key={field.id}
        style={{ gridColumn: `${gridStart} / span ${span}`, gridRow: "1" }}
        draggable={isActive}
        onDragStart={(event) => {
          if (!isActive) return;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", field.id);
          setDragging(true);
          setHoverPlacement(normalizedPlacement);
        }}
        onDragEnd={() => {
          setDragging(false);
          setHoverPlacement(null);
        }}
        className={cn(
          blockBaseClass,
          isActive
            ? "cursor-grab border-primary/40 bg-primary/10 text-foreground shadow-md"
            : "border-border bg-card text-foreground"
        )}
      >
        <FontAwesomeIcon icon={faGripVertical} className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground/60")} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{field.field_label}</p>
          <p className="text-[11px] text-muted-foreground">{span}/12 colonnes</p>
        </div>
      </div>
    );
  };

  const renderSurface = (
    surfacePlacement: Placement,
    rowFields: PlacedField[],
    label: string,
    isInsertionRow = false
  ) => {
    const activeOnSurface =
      previewPlacement.kind === surfacePlacement.kind &&
      (previewPlacement.kind === "existing"
        ? surfacePlacement.kind === "existing" && previewPlacement.row === surfacePlacement.row
        : surfacePlacement.kind === "between" && previewPlacement.beforeRow === surfacePlacement.beforeRow);

    const previewStart = activeOnSurface ? previewPlacement.startCol : undefined;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{label}</span>
          <span>{isInsertionRow ? "Déposez pour créer une ligne" : "Déposez dans un espace libre"}</span>
        </div>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            const desiredStart = getPointerStartCol(event, activeSpan);
            const nextPlacement = surfacePlacement.kind === "existing"
              ? {
                  kind: "existing" as const,
                  row: surfacePlacement.row,
                  startCol: findNearestAvailableStart(rowFields, desiredStart, activeSpan) ?? desiredStart,
                }
              : {
                  kind: "between" as const,
                  beforeRow: surfacePlacement.beforeRow,
                  startCol: desiredStart,
                };

            setHoverPlacement(nextPlacement);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const desiredStart = getPointerStartCol(event, activeSpan);
            const nextPlacement = surfacePlacement.kind === "existing"
              ? {
                  kind: "existing" as const,
                  row: surfacePlacement.row,
                  startCol: findNearestAvailableStart(rowFields, desiredStart, activeSpan) ?? desiredStart,
                }
              : {
                  kind: "between" as const,
                  beforeRow: surfacePlacement.beforeRow,
                  startCol: desiredStart,
                };

            setPlacement(nextPlacement);
            setHoverPlacement(null);
            setDragging(false);
          }}
          className={cn(
            "grid grid-cols-12 gap-2 rounded-2xl border p-2 transition-colors",
            activeOnSurface ? "border-primary/50 bg-primary/5" : "border-border/70 bg-muted/20"
          )}
        >
          {Array.from({ length: GRID_COLUMNS }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-[4.5rem] rounded-xl border border-dashed border-border/70 bg-background/70",
                activeOnSurface && previewStart !== undefined && index + 1 >= previewStart && index + 1 < previewStart + activeSpan
                  ? "border-primary/40 bg-primary/10"
                  : undefined
              )}
            />
          ))}

          {rowFields.map((field) => renderBlock(field))}
          {activeOnSurface && renderBlock(activeField, true, previewStart)}
        </div>
      </div>
    );
  };

  const topInsertionBefore = rowNumbers[0] ?? null;

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Placement visuel sur 12 colonnes</p>
          <p className="text-xs text-muted-foreground">Glissez le champ pour le positionner ; les offsets sont recalculés automatiquement.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {SPAN_OPTIONS.map((span) => (
            <Button
              key={span}
              type="button"
              variant={activeSpan === span ? "default" : "outline"}
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => onSpanChange(span)}
            >
              {span}/12
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {renderSurface({ kind: "between", beforeRow: topInsertionBefore, startCol: previewPlacement.startCol }, [], "Nouvelle ligne")}

        {rowNumbers.map((rowNumber, index) => (
          <div key={rowNumber} className="space-y-4">
            {renderSurface({ kind: "existing", row: rowNumber, startCol: previewPlacement.startCol }, rowMap.get(rowNumber) || [], `Ligne ${index + 1}`)}
            {renderSurface(
              { kind: "between", beforeRow: rowNumbers[index + 1] ?? null, startCol: previewPlacement.startCol },
              [],
              rowNumbers[index + 1] === undefined ? "Ajouter en dessous" : `Entre ligne ${index + 1} et ${index + 2}`,
              true
            )}
          </div>
        ))}
      </div>
    </div>
  );
}