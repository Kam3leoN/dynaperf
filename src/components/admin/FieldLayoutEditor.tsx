import { useCallback, useMemo, useRef, useState } from "react";
import { ActionIconButton } from "@/components/ActionIconButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical, faGripLines, faPenToSquare, faTrashCan, faPlus } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

const GRID_COLUMNS = 12;
const MIN_SPAN = 1;

export interface LayoutEditorField {
  id: string;
  field_label: string;
  sort_order: number;
  col_span: number;
  col_offset_before: number;
  col_offset_after: number;
  is_required?: boolean;
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
  startCol: number; // 1-based
  endCol: number;   // 1-based inclusive
}

interface FieldLayoutEditorProps {
  fields: LayoutEditorField[];
  onLayoutChange: (layout: LayoutDraftItem[]) => void;
  onEdit?: (fieldId: string) => void;
  onDelete?: (fieldId: string) => void;
  onAdd?: (colStart: number, colSpan: number, rowIndex: number) => void;
}

/* ── helpers ── */
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const placeFields = (fields: LayoutEditorField[]): PlacedField[] => {
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);
  let row = 0;
  let cursor = 1;
  return sorted.map((f) => {
    const span = clamp(f.col_span || 6, 1, GRID_COLUMNS);
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

const groupByRow = (fields: PlacedField[]): Map<number, PlacedField[]> => {
  const map = new Map<number, PlacedField[]>();
  fields.forEach((f) => {
    const arr = map.get(f.row) || [];
    arr.push(f);
    map.set(f.row, arr.sort((a, b) => a.startCol - b.startCol));
  });
  return map;
};

const serialize = (rows: PlacedField[][]): LayoutDraftItem[] => {
  let sortOrder = 0;
  return rows.flatMap((rowFields) => {
    let prevEnd = 0;
    return rowFields
      .sort((a, b) => a.startCol - b.startCol)
      .map<LayoutDraftItem>((f) => {
        const span = clamp(f.col_span, 1, GRID_COLUMNS);
        const offsetBefore = Math.max(f.startCol - prevEnd - 1, 0);
        prevEnd = f.startCol + span - 1;
        return { id: f.id, sort_order: sortOrder++, col_span: span, col_offset_before: offsetBefore, col_offset_after: 0 };
      });
  });
};

const getRowsArray = (rowMap: Map<number, PlacedField[]>, rowNumbers: number[]): PlacedField[][] =>
  rowNumbers.map((r) => rowMap.get(r) || []);

export function FieldLayoutEditor({ fields, onLayoutChange, onEdit, onDelete, onAdd }: FieldLayoutEditorProps) {
  const placed = useMemo(() => placeFields(fields), [fields]);
  const rowMap = useMemo(() => groupByRow(placed), [placed]);
  const rowNumbers = useMemo(() => [...rowMap.keys()].sort((a, b) => a - b), [rowMap]);

  const gridRef = useRef<HTMLDivElement>(null);

  /* ── Row drag state ── */
  const [dragRowIdx, setDragRowIdx] = useState<number | null>(null);
  const [dragOverRowIdx, setDragOverRowIdx] = useState<number | null>(null);

  /* ── Field drag state ── */
  const [dragFieldId, setDragFieldId] = useState<string | null>(null);
  const [fieldDragPreview, setFieldDragPreview] = useState<{ row: number; startCol: number } | null>(null);

  /* ── Resize state ── */
  const [resizeId, setResizeId] = useState<string | null>(null);
  const resizeRef = useRef<{
    side: "left" | "right";
    startX: number;
    origStart: number;
    origSpan: number;
    fieldId: string;
    rowFields: PlacedField[];
    allPlaced: PlacedField[];
  } | null>(null);

  /* ── New field drag-select ── */
  const [newFieldDrag, setNewFieldDrag] = useState<{ row: number; startCol: number; endCol: number } | null>(null);
  const newFieldRef = useRef<{ row: number; startCol: number } | null>(null);

  const colWidth = useCallback(() => {
    if (!gridRef.current) return 60;
    return gridRef.current.getBoundingClientRect().width / GRID_COLUMNS;
  }, []);

  /* ── Commit helper ── */
  const commitPlaced = useCallback((updatedPlaced: PlacedField[]) => {
    const updatedRowMap = groupByRow(updatedPlaced);
    const updatedRowNumbers = [...updatedRowMap.keys()].sort((a, b) => a - b);
    const rows = getRowsArray(updatedRowMap, updatedRowNumbers);
    onLayoutChange(serialize(rows));
  }, [onLayoutChange]);

  /* ══════ ROW DRAG ══════ */
  const onRowDragStart = useCallback((e: React.DragEvent, rowIdx: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "row");
    setDragRowIdx(rowIdx);
  }, []);

  const onRowDragOver = useCallback((e: React.DragEvent, rowIdx: number) => {
    if (dragRowIdx === null) return;
    e.preventDefault();
    setDragOverRowIdx(rowIdx);
  }, [dragRowIdx]);

  const onRowDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragRowIdx === null || dragRowIdx === targetIdx) {
      setDragRowIdx(null);
      setDragOverRowIdx(null);
      return;
    }
    const rows = getRowsArray(rowMap, rowNumbers);
    const [moved] = rows.splice(dragRowIdx, 1);
    rows.splice(targetIdx, 0, moved);
    onLayoutChange(serialize(rows));
    setDragRowIdx(null);
    setDragOverRowIdx(null);
  }, [dragRowIdx, rowMap, rowNumbers, onLayoutChange]);

  /* ══════ FIELD DRAG ══════ */
  const getColFromEvent = useCallback((e: React.DragEvent, span: number) => {
    if (!gridRef.current) return 1;
    const rowEl = (e.target as HTMLElement).closest("[data-row-index]");
    const rect = (rowEl?.querySelector(".grid") || gridRef.current).getBoundingClientRect();
    const cw = rect.width / GRID_COLUMNS;
    const col = Math.floor((e.clientX - rect.left) / cw) + 1;
    return clamp(col, 1, GRID_COLUMNS - span + 1);
  }, []);

  const getRowIdxFromEvent = useCallback((e: React.DragEvent) => {
    if (!gridRef.current) return 0;
    const rows = gridRef.current.querySelectorAll("[data-row-index]");
    let closest = 0;
    let minDist = Infinity;
    rows.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(e.clientY - center);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    return closest;
  }, []);

  /* ══════ RESIZE with push ══════ */
  const onResizeStart = useCallback((e: React.MouseEvent, fieldId: string, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    const f = placed.find((p) => p.id === fieldId);
    if (!f) return;
    const rowFields = placed.filter((p) => p.row === f.row);
    setResizeId(fieldId);
    resizeRef.current = {
      side,
      startX: e.clientX,
      origStart: f.startCol,
      origSpan: f.col_span,
      fieldId,
      rowFields: rowFields.map((r) => ({ ...r })),
      allPlaced: placed.map((p) => ({ ...p })),
    };

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const cw = colWidth();
      const delta = Math.round((ev.clientX - resizeRef.current.startX) / cw);
      if (delta === 0) return;

      const { side: s, origStart, origSpan, fieldId: fId, rowFields: origRow, allPlaced: origAll } = resizeRef.current;
      const sortedRow = [...origRow].sort((a, b) => a.startCol - b.startCol);
      const fIdx = sortedRow.findIndex((f2) => f2.id === fId);
      if (fIdx === -1) return;

      // Clone row for mutation
      const newRow = sortedRow.map((f2) => ({ ...f2 }));
      const target = newRow[fIdx];

      if (s === "right") {
        // Grow/shrink right edge, push right neighbors
        const newSpan = clamp(origSpan + delta, MIN_SPAN, GRID_COLUMNS);
        const newEnd = origStart + newSpan - 1;
        if (newEnd > GRID_COLUMNS) return;
        target.col_span = newSpan;
        target.endCol = newEnd;

        // Push fields to the right
        let cursor = newEnd + 1;
        for (let i = fIdx + 1; i < newRow.length; i++) {
          const nf = newRow[i];
          if (nf.startCol < cursor) {
            const shift = cursor - nf.startCol;
            nf.startCol += shift;
            nf.endCol += shift;
          }
          if (nf.endCol > GRID_COLUMNS) return; // can't push further
          cursor = nf.endCol + 1;
        }
      } else {
        // Grow/shrink left edge, push left neighbors
        const newStart = clamp(origStart + delta, 1, origStart + origSpan - MIN_SPAN);
        const newSpan = origSpan - (newStart - origStart);
        target.startCol = newStart;
        target.col_span = newSpan;
        target.endCol = newStart + newSpan - 1;

        // Push fields to the left
        let cursor = newStart - 1;
        for (let i = fIdx - 1; i >= 0; i--) {
          const nf = newRow[i];
          if (nf.endCol > cursor) {
            const shift = nf.endCol - cursor;
            nf.startCol -= shift;
            nf.endCol -= shift;
          }
          if (nf.startCol < 1) return; // can't push further
          cursor = nf.startCol - 1;
        }
      }

      // Rebuild allPlaced with updated row
      const updatedAll = origAll.map((p) => {
        const fromRow = newRow.find((r) => r.id === p.id);
        return fromRow || p;
      });
      commitPlaced(updatedAll);
    };

    const onUp = () => {
      setResizeId(null);
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [placed, colWidth, commitPlaced]);

  /* ══════ New field drag-select ══════ */
  const onEmptyCellMouseDown = useCallback((row: number, col: number) => {
    newFieldRef.current = { row, startCol: col };
    setNewFieldDrag({ row, startCol: col, endCol: col });

    const onMove = (ev: MouseEvent) => {
      if (!newFieldRef.current || !gridRef.current) return;
      const cw = colWidth();
      const rowEl = gridRef.current.querySelectorAll("[data-row-index]")[newFieldRef.current.row];
      if (!rowEl) return;
      const gridEl = rowEl.querySelector(".grid");
      if (!gridEl) return;
      const rect = gridEl.getBoundingClientRect();
      const mouseCol = clamp(Math.floor((ev.clientX - rect.left) / cw) + 1, 1, GRID_COLUMNS);
      const start = Math.min(newFieldRef.current.startCol, mouseCol);
      const end = Math.max(newFieldRef.current.startCol, mouseCol);

      const rowFields = placed.filter((f) => f.row === row);
      const occupied = new Set<number>();
      rowFields.forEach((f) => { for (let c = f.startCol; c <= f.endCol; c++) occupied.add(c); });
      let clampedStart = start;
      let clampedEnd = end;
      for (let c = start; c <= end; c++) {
        if (occupied.has(c)) {
          if (c <= newFieldRef.current.startCol) clampedStart = c + 1;
          else { clampedEnd = c - 1; break; }
        }
      }
      if (clampedEnd >= clampedStart) {
        setNewFieldDrag({ row, startCol: clampedStart, endCol: clampedEnd });
      }
    };

    const onUp = () => {
      newFieldRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Commit is handled via effect on newFieldDrag
      setNewFieldDrag((prev) => {
        if (prev && onAdd) {
          const span = prev.endCol - prev.startCol + 1;
          setTimeout(() => onAdd(prev.startCol, span, prev.row), 0);
        }
        return null;
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [placed, colWidth, onAdd]);

  /* ── Render ── */
  const totalRows = rowNumbers.length;
  const nextEmptyRow = totalRows > 0 ? Math.max(...rowNumbers) + 1 : 0;

  return (
    <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/20 p-4" ref={gridRef}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-sm font-medium text-foreground">Placement visuel sur 12 colonnes</p>
          <p className="text-xs text-muted-foreground">
            Glissez ⠿ pour déplacer un champ, ≡ pour déplacer une ligne, tirez les bords pour redimensionner
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {/* Existing rows */}
        {rowNumbers.map((rowNum, rowIdx) => {
          const rowFields = rowMap.get(rowNum) || [];
          const emptyCells = getEmptyCells(rowFields);
          const isDragOver = dragOverRowIdx === rowIdx && dragRowIdx !== null && dragRowIdx !== rowIdx;

          return (
            <div
              key={rowNum}
              data-row-index={rowIdx}
              className={cn(
                "relative transition-all",
                isDragOver && "ring-2 ring-primary/40 rounded-xl",
                dragRowIdx === rowIdx && "opacity-40"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                // Row drag
                if (dragRowIdx !== null) {
                  onRowDragOver(e, rowIdx);
                  return;
                }
                // Field drag
                if (dragFieldId) {
                  const f = placed.find((p) => p.id === dragFieldId);
                  if (!f) return;
                  const col = getColFromEvent(e, f.col_span);
                  setFieldDragPreview({ row: rowIdx, startCol: col });
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                // Row drag
                if (dragRowIdx !== null) {
                  onRowDrop(e, rowIdx);
                  return;
                }
                // Field drag
                if (dragFieldId && fieldDragPreview) {
                  const f = placed.find((p) => p.id === dragFieldId);
                  if (!f) return;
                  // Build updated placed with field moved
                  const targetRowNum = rowNumbers[fieldDragPreview.row] ?? nextEmptyRow;
                  const updated = placed.map((p) => {
                    if (p.id === dragFieldId) {
                      return { ...p, row: targetRowNum, startCol: fieldDragPreview.startCol, endCol: fieldDragPreview.startCol + p.col_span - 1 };
                    }
                    return p;
                  });
                  commitPlaced(updated);
                  setDragFieldId(null);
                  setFieldDragPreview(null);
                }
              }}
            >
              {/* Row header with drag handle */}
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                <div
                  className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted transition-colors"
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    onRowDragStart(e, rowIdx);
                  }}
                  onDragEnd={() => { setDragRowIdx(null); setDragOverRowIdx(null); }}
                >
                  <FontAwesomeIcon icon={faGripLines} className="h-2.5 w-2.5" />
                </div>
                <span>Ligne {rowIdx + 1}</span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-12 gap-0.5 rounded-xl border border-border/50 bg-background/50 p-1 min-h-[3.5rem] relative">
                {/* Background cells */}
                {Array.from({ length: GRID_COLUMNS }).map((_, ci) => {
                  const col = ci + 1;
                  const isOccupied = rowFields.some((f) => col >= f.startCol && col <= f.endCol);
                  const isInNewDrag = newFieldDrag && newFieldDrag.row === rowNum && col >= newFieldDrag.startCol && col <= newFieldDrag.endCol;
                  const isFieldDragTarget = fieldDragPreview && fieldDragPreview.row === rowIdx && dragFieldId
                    && (() => {
                      const f = placed.find((p) => p.id === dragFieldId);
                      return f && col >= fieldDragPreview.startCol && col < fieldDragPreview.startCol + f.col_span;
                    })();

                  return (
                    <div
                      key={ci}
                      className={cn(
                        "h-[3.5rem] rounded-lg border border-dashed transition-colors relative group/cell",
                        isOccupied ? "border-transparent" :
                          isInNewDrag ? "border-primary/60 bg-primary/15" :
                            isFieldDragTarget ? "border-primary/40 bg-primary/10" :
                              "border-border/40 bg-muted/10 hover:border-primary/30 hover:bg-primary/5"
                      )}
                      onMouseDown={(e) => {
                        if (!isOccupied && !isInNewDrag && onAdd) {
                          e.preventDefault();
                          onEmptyCellMouseDown(rowNum, col);
                        }
                      }}
                    >
                      {!isOccupied && !isInNewDrag && !isFieldDragTarget && (
                        <button
                          type="button"
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); onAdd?.(col, 1, rowNum); }}
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
                      "absolute top-1 bottom-1 flex items-center gap-1 rounded-xl px-2 transition-all select-none z-10",
                      resizeId === f.id
                        ? "border-2 border-primary bg-primary/15 shadow-md"
                        : "border-2 border-border bg-card hover:border-primary/40 hover:shadow-sm"
                    )}
                    style={{
                      left: `calc(${((f.startCol - 1) / GRID_COLUMNS) * 100}% + 4px)`,
                      width: `calc(${(f.col_span / GRID_COLUMNS) * 100}% - 8px)`,
                    }}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", "field");
                      setDragFieldId(f.id);
                      setFieldDragPreview({ row: rowIdx, startCol: f.startCol });
                    }}
                    onDragEnd={() => { setDragFieldId(null); setFieldDragPreview(null); }}
                  >
                    {/* Left resize handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2.5 cursor-col-resize group/handle rounded-l-xl flex items-center justify-center"
                      onMouseDown={(e) => onResizeStart(e, f.id, "left")}
                    >
                      <div className="w-0.5 h-4 rounded-full bg-muted-foreground/20 group-hover/handle:bg-primary/60 transition-colors" />
                    </div>

                    <FontAwesomeIcon icon={faGripVertical} className="h-3 w-3 shrink-0 text-muted-foreground/50 cursor-grab ml-1" />
                    <div className="flex-1 min-w-0 mx-1">
                    <p className="truncate text-xs font-medium text-foreground leading-tight">
                        {f.field_label}{f.is_required && <span className="text-destructive ml-0.5">*</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{f.col_span}/12</p>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {onEdit && (
                        <ActionIconButton
                          variant="edit"
                          label="Modifier le champ"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(f.id);
                          }}
                        >
                          <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
                        </ActionIconButton>
                      )}
                      {onDelete && (
                        <ActionIconButton
                          variant="destructive"
                          label="Retirer le champ"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(f.id);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
                        </ActionIconButton>
                      )}
                    </div>

                    {/* Right resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize group/handle rounded-r-xl flex items-center justify-center"
                      onMouseDown={(e) => onResizeStart(e, f.id, "right")}
                    >
                      <div className="w-0.5 h-4 rounded-full bg-muted-foreground/20 group-hover/handle:bg-primary/60 transition-colors" />
                    </div>
                  </div>
                ))}

                {/* Field drag preview ghost */}
                {dragFieldId && fieldDragPreview && fieldDragPreview.row === rowIdx && (() => {
                  const f = placed.find((p) => p.id === dragFieldId);
                  if (!f) return null;
                  return (
                    <div
                      className="absolute top-1 bottom-1 rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 z-5 pointer-events-none"
                      style={{
                        left: `calc(${((fieldDragPreview.startCol - 1) / GRID_COLUMNS) * 100}% + 4px)`,
                        width: `calc(${(f.col_span / GRID_COLUMNS) * 100}% - 8px)`,
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          );
        })}

        {/* Empty "new row" zone — always visible */}
        <div
          data-row-index={totalRows}
          className={cn(
            "relative transition-all",
            dragOverRowIdx === totalRows && dragRowIdx !== null && "ring-2 ring-primary/40 rounded-xl"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            if (dragRowIdx !== null) onRowDragOver(e, totalRows);
            if (dragFieldId) {
              const f = placed.find((p) => p.id === dragFieldId);
              if (!f) return;
              const col = getColFromEvent(e, f.col_span);
              setFieldDragPreview({ row: totalRows, startCol: col });
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragRowIdx !== null) { onRowDrop(e, totalRows); return; }
            if (dragFieldId && fieldDragPreview) {
              const f = placed.find((p) => p.id === dragFieldId);
              if (!f) return;
              const updated = placed.map((p) => {
                if (p.id === dragFieldId) {
                  return { ...p, row: nextEmptyRow, startCol: fieldDragPreview.startCol, endCol: fieldDragPreview.startCol + p.col_span - 1 };
                }
                return p;
              });
              commitPlaced(updated);
              setDragFieldId(null);
              setFieldDragPreview(null);
            }
          }}
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
            <FontAwesomeIcon icon={faPlus} className="h-2 w-2" />
            <span>Nouvelle ligne</span>
          </div>
          <div className="grid grid-cols-12 gap-0.5 rounded-xl border border-dashed border-border/40 bg-muted/5 p-1 min-h-[3.5rem] relative">
            {Array.from({ length: GRID_COLUMNS }).map((_, ci) => {
              const col = ci + 1;
              const isInNewDrag = newFieldDrag && newFieldDrag.row === nextEmptyRow && col >= newFieldDrag.startCol && col <= newFieldDrag.endCol;
              const isFieldDragTarget = fieldDragPreview && fieldDragPreview.row === totalRows && dragFieldId
                && (() => {
                  const f = placed.find((p) => p.id === dragFieldId);
                  return f && col >= fieldDragPreview.startCol && col < fieldDragPreview.startCol + f.col_span;
                })();

              return (
                <div
                  key={ci}
                  className={cn(
                    "h-[3.5rem] rounded-lg border border-dashed transition-colors relative group/cell",
                    isInNewDrag ? "border-primary/60 bg-primary/15" :
                      isFieldDragTarget ? "border-primary/40 bg-primary/10" :
                        "border-border/30 bg-muted/5 hover:border-primary/30 hover:bg-primary/5"
                  )}
                  onMouseDown={(e) => {
                    if (onAdd) {
                      e.preventDefault();
                      onEmptyCellMouseDown(nextEmptyRow, col);
                    }
                  }}
                >
                  {!isInNewDrag && !isFieldDragTarget && (
                    <button
                      type="button"
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); onAdd?.(col, 1, nextEmptyRow); }}
                    >
                      <FontAwesomeIcon icon={faPlus} className="h-3 w-3 text-muted-foreground/60" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Field drag preview ghost on new row */}
            {dragFieldId && fieldDragPreview && fieldDragPreview.row === totalRows && (() => {
              const f = placed.find((p) => p.id === dragFieldId);
              if (!f) return null;
              return (
                <div
                  className="absolute top-1 bottom-1 rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 z-5 pointer-events-none"
                  style={{
                    left: `calc(${((fieldDragPreview.startCol - 1) / GRID_COLUMNS) * 100}% + 4px)`,
                    width: `calc(${(f.col_span / GRID_COLUMNS) * 100}% - 8px)`,
                  }}
                />
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── helper used in render ── */
function getEmptyCells(rowFields: PlacedField[]): { col: number }[] {
  const occupied = new Set<number>();
  rowFields.forEach((f) => { for (let c = f.startCol; c <= f.endCol; c++) occupied.add(c); });
  const cells: { col: number }[] = [];
  for (let c = 1; c <= GRID_COLUMNS; c++) {
    if (!occupied.has(c)) cells.push({ col: c });
  }
  return cells;
}
