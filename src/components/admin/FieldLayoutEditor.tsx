import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical, faPenToSquare, faTrashCan, faPlus } from "@fortawesome/free-solid-svg-icons";
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

interface PlacedField extends LayoutEditorField {
  row: number;
  startCol: number;
  endCol: number;
}

interface FieldLayoutEditorProps {
  fields: LayoutEditorField[];
  onLayoutChange: (layout: LayoutDraftItem[]) => void;
  onEdit?: (fieldId: string) => void;
  onDelete?: (fieldId: string) => void;
  onAdd?: (colStart: number, colSpan: number, rowIndex: number) => void;
}

/* ── Placement helpers ── */
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const clampSpan = (s: number) => clamp(s || 6, 1, GRID_COLUMNS);

const placeFields = (fields: LayoutEditorField[]): PlacedField[] => {
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);
  let row = 0;
  let cursor = 1;
  return sorted.map((f) => {
    const span = clampSpan(f.col_span);
    const before = clamp(f.col_offset_before || 0, 0, 11);
    let startCol = cursor + before;
    if (startCol + span - 1 > GRID_COLUMNS) {
      row++;
      cursor = 1;
      startCol = 1 + clamp(before, 0, GRID_COLUMNS - span);
    }
    const placed: PlacedField = { ...f, col_span: span, row, startCol, endCol: startCol + span - 1 };
    cursor = startCol + span + clamp(f.col_offset_after || 0, 0, 11);
    if (cursor > GRID_COLUMNS) { row++; cursor = 1; }
    return placed;
  });
};

const groupByRow = (fields: PlacedField[]) => {
  const map = new Map<number, PlacedField[]>();
  fields.forEach((f) => {
    const arr = map.get(f.row) || [];
    arr.push(f);
    map.set(f.row, arr.sort((a, b) => a.startCol - b.startCol));
  });
  return map;
};

/* Serialize placed fields back to LayoutDraftItems */
const serialize = (rows: PlacedField[][]): LayoutDraftItem[] => {
  let sortOrder = 0;
  return rows.flatMap((rowFields) => {
    let prevEnd = 0;
    return rowFields
      .sort((a, b) => a.startCol - b.startCol)
      .map<LayoutDraftItem>((f) => {
        const span = clampSpan(f.col_span);
        const offsetBefore = Math.max(f.startCol - prevEnd - 1, 0);
        prevEnd = f.startCol + span - 1;
        return { id: f.id, sort_order: sortOrder++, col_span: span, col_offset_before: offsetBefore, col_offset_after: 0 };
      });
  });
};

/* ── Empty cell info for a row ── */
const getEmptyCells = (rowFields: PlacedField[]): { col: number }[] => {
  const occupied = new Set<number>();
  rowFields.forEach((f) => {
    for (let c = f.startCol; c <= f.endCol; c++) occupied.add(c);
  });
  const cells: { col: number }[] = [];
  for (let c = 1; c <= GRID_COLUMNS; c++) {
    if (!occupied.has(c)) cells.push({ col: c });
  }
  return cells;
};

export function FieldLayoutEditor({ fields, onLayoutChange, onEdit, onDelete, onAdd }: FieldLayoutEditorProps) {
  const placed = useMemo(() => placeFields(fields), [fields]);
  const rowMap = useMemo(() => groupByRow(placed), [placed]);
  const rowNumbers = useMemo(() => [...rowMap.keys()].sort((a, b) => a - b), [rowMap]);

  /* ── Drag state ── */
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ row: number; startCol: number } | null>(null);

  /* ── Resize state ── */
  const [resizeId, setResizeId] = useState<string | null>(null);
  const resizeRef = useRef<{ side: "left" | "right"; startX: number; origStart: number; origSpan: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  /* ── New field drag-select state ── */
  const [newFieldDrag, setNewFieldDrag] = useState<{ row: number; startCol: number; endCol: number } | null>(null);
  const newFieldRef = useRef<{ row: number; startCol: number } | null>(null);

  const colWidth = useCallback(() => {
    if (!gridRef.current) return 60;
    return gridRef.current.getBoundingClientRect().width / GRID_COLUMNS;
  }, []);

  /* ── Build rows array for serialization ── */
  const buildRows = useCallback((overrides?: { id: string; startCol: number; span: number; targetRow: number }) => {
    const maxRow = Math.max(...placed.map((f) => f.row), 0);
    const rows: PlacedField[][] = [];
    for (let r = 0; r <= maxRow + 1; r++) {
      const rowFields = placed.filter((f) => {
        if (overrides && f.id === overrides.id) return false;
        return f.row === r;
      });
      if (overrides && overrides.targetRow === r) {
        rowFields.push({
          ...placed.find((f) => f.id === overrides.id)!,
          startCol: overrides.startCol,
          endCol: overrides.startCol + overrides.span - 1,
          col_span: overrides.span,
          row: r,
        });
      }
      if (rowFields.length > 0) rows.push(rowFields);
    }
    return rows;
  }, [placed]);

  /* ── Resize handlers ── */
  const onResizeStart = useCallback((e: React.MouseEvent, fieldId: string, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    const f = placed.find((p) => p.id === fieldId);
    if (!f) return;
    setResizeId(fieldId);
    resizeRef.current = { side, startX: e.clientX, origStart: f.startCol, origSpan: f.col_span };

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const cw = colWidth();
      const delta = Math.round((ev.clientX - resizeRef.current.startX) / cw);
      const { side: s, origStart, origSpan } = resizeRef.current;
      let newStart = origStart;
      let newSpan = origSpan;
      if (s === "right") {
        newSpan = clamp(origSpan + delta, 1, GRID_COLUMNS - origStart + 1);
      } else {
        newStart = clamp(origStart + delta, 1, origStart + origSpan - 1);
        newSpan = origSpan - (newStart - origStart);
      }
      // Check no overlap
      const rowFields = placed.filter((p) => p.row === f.row && p.id !== fieldId);
      const newEnd = newStart + newSpan - 1;
      const overlaps = rowFields.some((p) => !(newEnd < p.startCol || newStart > p.endCol));
      if (!overlaps) {
        setDragPreview({ row: f.row, startCol: newStart });
        // Apply resize
        const updated = placed.map((p) =>
          p.id === fieldId ? { ...p, startCol: newStart, endCol: newEnd, col_span: newSpan } : p
        );
        const rowMapUpdated = groupByRow(updated);
        const rows = [...rowMapUpdated.entries()].sort(([a], [b]) => a - b).map(([, v]) => v);
        onLayoutChange(serialize(rows));
      }
    };

    const onUp = () => {
      setResizeId(null);
      resizeRef.current = null;
      setDragPreview(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [placed, colWidth, onLayoutChange]);

  /* ── Drag-drop handlers ── */
  const getColFromEvent = useCallback((e: React.DragEvent, span: number) => {
    if (!gridRef.current) return 1;
    const rect = gridRef.current.getBoundingClientRect();
    const cw = rect.width / GRID_COLUMNS;
    const col = Math.floor((e.clientX - rect.left) / cw) + 1;
    return clamp(col, 1, GRID_COLUMNS - span + 1);
  }, []);

  const getRowFromEvent = useCallback((e: React.DragEvent) => {
    if (!gridRef.current) return 0;
    const rows = gridRef.current.querySelectorAll("[data-row-index]");
    let closest = 0;
    let minDist = Infinity;
    rows.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(e.clientY - center);
      if (dist < minDist) {
        minDist = dist;
        closest = parseInt(el.getAttribute("data-row-index") || "0");
      }
    });
    return closest;
  }, []);

  /* ── New-field mouse handlers for empty cells ── */
  const onEmptyCellMouseDown = useCallback((row: number, col: number) => {
    newFieldRef.current = { row, startCol: col };
    setNewFieldDrag({ row, startCol: col, endCol: col });

    const onMove = (ev: MouseEvent) => {
      if (!newFieldRef.current || !gridRef.current) return;
      const cw = colWidth();
      const rect = gridRef.current.getBoundingClientRect();
      const mouseCol = clamp(Math.floor((ev.clientX - rect.left) / cw) + 1, 1, GRID_COLUMNS);
      const start = Math.min(newFieldRef.current.startCol, mouseCol);
      const end = Math.max(newFieldRef.current.startCol, mouseCol);
      // Check occupied in this row
      const rowFields = placed.filter((f) => f.row === newFieldRef.current!.row);
      const occupied = new Set<number>();
      rowFields.forEach((f) => { for (let c = f.startCol; c <= f.endCol; c++) occupied.add(c); });
      let clampedEnd = end;
      for (let c = start; c <= end; c++) {
        if (occupied.has(c)) { clampedEnd = c - 1; break; }
      }
      if (clampedEnd >= start) {
        setNewFieldDrag({ row: newFieldRef.current.row, startCol: start, endCol: clampedEnd });
      }
    };

    const onUp = () => {
      if (newFieldRef.current && newFieldDrag) {
        // We need to get the latest newFieldDrag state - use ref-based approach
      }
      newFieldRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [placed, colWidth, newFieldDrag]);

  // Handle new field creation on mouseup via effect
  const handleNewFieldComplete = useCallback(() => {
    if (newFieldDrag && onAdd) {
      const span = newFieldDrag.endCol - newFieldDrag.startCol + 1;
      onAdd(newFieldDrag.startCol, span, newFieldDrag.row);
    }
    setNewFieldDrag(null);
  }, [newFieldDrag, onAdd]);

  /* ── Render ── */
  const totalRows = rowNumbers.length > 0 ? Math.max(...rowNumbers) + 1 : 0;
  const renderRows = totalRows + 1; // extra empty row at end

  return (
    <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/20 p-4" ref={gridRef}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-foreground">Placement visuel sur 12 colonnes</p>
          <p className="text-xs text-muted-foreground">Glissez pour déplacer, tirez les bords pour redimensionner, + pour ajouter</p>
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: renderRows }).map((_, rowIdx) => {
          const rowFields = rowMap.get(rowNumbers[rowIdx] ?? -1) || [];
          const emptyCells = getEmptyCells(rowFields);
          const actualRow = rowNumbers[rowIdx] ?? (rowNumbers.length > 0 ? Math.max(...rowNumbers) + 1 : 0);

          return (
            <div
              key={rowIdx}
              data-row-index={actualRow}
              className="relative"
              onDragOver={(e) => {
                e.preventDefault();
                if (!dragId) return;
                const f = placed.find((p) => p.id === dragId);
                if (!f) return;
                const col = getColFromEvent(e, f.col_span);
                setDragPreview({ row: actualRow, startCol: col });
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragId || !dragPreview) return;
                const f = placed.find((p) => p.id === dragId);
                if (!f) return;
                const rows = buildRows({ id: dragId, startCol: dragPreview.startCol, span: f.col_span, targetRow: dragPreview.row });
                onLayoutChange(serialize(rows));
                setDragId(null);
                setDragPreview(null);
              }}
            >
              {/* Row label */}
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                <span>{rowFields.length > 0 ? `Ligne ${rowIdx + 1}` : "Nouvelle ligne"}</span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-12 gap-0.5 rounded-xl border border-border/50 bg-background/50 p-1 min-h-[3.5rem] relative">
                {/* Background cells */}
                {Array.from({ length: GRID_COLUMNS }).map((_, ci) => {
                  const isOccupied = rowFields.some((f) => ci + 1 >= f.startCol && ci + 1 <= f.endCol);
                  const isInNewDrag = newFieldDrag && newFieldDrag.row === actualRow && ci + 1 >= newFieldDrag.startCol && ci + 1 <= newFieldDrag.endCol;
                  const isDragTarget = dragPreview && dragPreview.row === actualRow && dragId
                    && (() => {
                      const f = placed.find((p) => p.id === dragId);
                      return f && ci + 1 >= dragPreview.startCol && ci + 1 < dragPreview.startCol + f.col_span;
                    })();

                  return (
                    <div
                      key={ci}
                      className={cn(
                        "h-[3.5rem] rounded-lg border border-dashed transition-colors relative group/cell",
                        isOccupied ? "border-transparent" :
                          isInNewDrag ? "border-primary/60 bg-primary/15" :
                            isDragTarget ? "border-primary/40 bg-primary/10" :
                              "border-border/40 bg-muted/10 hover:border-primary/30 hover:bg-primary/5"
                      )}
                      onMouseDown={(e) => {
                        if (!isOccupied && !isInNewDrag && onAdd) {
                          e.preventDefault();
                          onEmptyCellMouseDown(actualRow, ci + 1);
                        }
                      }}
                      onMouseUp={() => {
                        if (newFieldDrag) {
                          handleNewFieldComplete();
                        }
                      }}
                    >
                      {/* "+" button in empty cells */}
                      {!isOccupied && !isInNewDrag && !isDragTarget && (
                        <button
                          type="button"
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdd?.(ci + 1, 1, actualRow);
                          }}
                        >
                          <FontAwesomeIcon icon={faPlus} className="h-3 w-3 text-muted-foreground/60" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Placed field blocks */}
                {rowFields.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      "absolute top-1 bottom-1 flex items-center gap-1 rounded-xl border px-2 transition-all select-none z-10",
                      resizeId === f.id
                        ? "border-primary bg-primary/15 shadow-md"
                        : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                    )}
                    style={{
                      left: `calc(${((f.startCol - 1) / GRID_COLUMNS) * 100}% + 4px)`,
                      width: `calc(${(f.col_span / GRID_COLUMNS) * 100}% - 8px)`,
                    }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(f.id);
                      setDragPreview({ row: f.row, startCol: f.startCol });
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragPreview(null);
                    }}
                  >
                    {/* Left resize handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 rounded-l-xl"
                      onMouseDown={(e) => onResizeStart(e, f.id, "left")}
                    />

                    <FontAwesomeIcon icon={faGripVertical} className="h-3 w-3 shrink-0 text-muted-foreground/50 cursor-grab" />
                    <div className="flex-1 min-w-0 mx-1">
                      <p className="truncate text-xs font-medium text-foreground leading-tight">{f.field_label}</p>
                      <p className="text-[10px] text-muted-foreground">{f.col_span}/12</p>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {onEdit && (
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted transition-colors"
                          onClick={(e) => { e.stopPropagation(); onEdit(f.id); }}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-destructive/10 transition-colors"
                          onClick={(e) => { e.stopPropagation(); onDelete(f.id); }}
                        >
                          <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3 text-destructive/70" />
                        </button>
                      )}
                    </div>

                    {/* Right resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/20 rounded-r-xl"
                      onMouseDown={(e) => onResizeStart(e, f.id, "right")}
                    />
                  </div>
                ))}

                {/* Drag preview ghost */}
                {dragId && dragPreview && dragPreview.row === actualRow && (() => {
                  const f = placed.find((p) => p.id === dragId);
                  if (!f) return null;
                  return (
                    <div
                      className="absolute top-1 bottom-1 rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 z-5 pointer-events-none"
                      style={{
                        left: `calc(${((dragPreview.startCol - 1) / GRID_COLUMNS) * 100}% + 4px)`,
                        width: `calc(${(f.col_span / GRID_COLUMNS) * 100}% - 8px)`,
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
