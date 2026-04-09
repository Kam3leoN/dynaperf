import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrashCan,
  faPenToSquare,
  faGripVertical,
  faCheck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

interface ChecklistItemsEditorProps {
  /** Newline-separated string of items */
  value: string;
  onChange: (value: string) => void;
  maxPoints: number;
}

export function ChecklistItemsEditor({
  value,
  onChange,
  maxPoints,
}: ChecklistItemsEditorProps) {
  const items = value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const pointsPerItem = items.length > 0 ? maxPoints / items.length : 0;
  const displayPts = (idx: number) => {
    if (items.length === 0) return "0";
    // distribute points: each item gets floor, remainder spread to first N
    const base = Math.floor(maxPoints / items.length);
    const remainder = maxPoints % items.length;
    return String(idx < remainder ? base + 1 : base);
  };

  const update = (newItems: string[]) => {
    onChange(newItems.join("\n"));
  };

  const addItem = () => {
    if (!newValue.trim()) return;
    update([...items, newValue.trim()]);
    setNewValue("");
    setTimeout(() => newInputRef.current?.focus(), 50);
  };

  const removeItem = (idx: number) => {
    update(items.filter((_, i) => i !== idx));
    if (editingIdx === idx) {
      setEditingIdx(null);
    }
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(items[idx]);
  };

  const confirmEdit = () => {
    if (editingIdx === null) return;
    if (!editValue.trim()) {
      removeItem(editingIdx);
    } else {
      const next = [...items];
      next[editingIdx] = editValue.trim();
      update(next);
    }
    setEditingIdx(null);
  };

  const cancelEdit = () => setEditingIdx(null);

  // Drag handlers
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragEnd = () => {
    setDragIdx(null);
    setDropIdx(null);
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDropIdx(idx);
  };
  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    update(next);
    setDragIdx(null);
    setDropIdx(null);
  };

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div
          key={`${idx}-${item}`}
          draggable={editingIdx !== idx}
          onDragStart={() => handleDragStart(idx)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors group ${
            dropIdx === idx && dragIdx !== null && dragIdx !== idx
              ? "border-primary bg-primary/5"
              : "border-border bg-background"
          } ${dragIdx === idx ? "opacity-40" : ""}`}
        >
          <FontAwesomeIcon
            icon={faGripVertical}
            className="h-3 w-3 text-muted-foreground/40 cursor-grab shrink-0"
          />

          <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0 w-8 text-right">
            {displayPts(idx)} pt{Number(displayPts(idx)) > 1 ? "s" : ""}
          </span>

          {editingIdx === idx ? (
            <>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-7 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmEdit();
                  }
                  if (e.key === "Escape") cancelEdit();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-emerald-600 shrink-0"
                onClick={confirmEdit}
              >
                <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground shrink-0"
                onClick={cancelEdit}
              >
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm flex-1 min-w-0 truncate">{item}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => startEdit(idx)}
              >
                <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeItem(idx)}
              >
                <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ))}

      {/* Add new item */}
      <div className="flex items-center gap-2 pt-1">
        <Input
          ref={newInputRef}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Nouveau check…"
          className="h-8 text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs shrink-0"
          onClick={addItem}
          disabled={!newValue.trim()}
        >
          <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
          Ajouter
        </Button>
      </div>

      {items.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {items.length} élément{items.length > 1 ? "s" : ""} · {maxPoints} pts max
        </p>
      )}
    </div>
  );
}
