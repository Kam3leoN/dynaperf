import { useRef, useState } from "react";
import { ActionIconButton } from "@/components/ActionIconButton";
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

interface ChecklistItem {
  label: string;
  points: number;
}

interface ChecklistItemsEditorProps {
  /** Newline-separated string of items (legacy: plain text, new: JSON with points) */
  value: string;
  onChange: (value: string) => void;
  maxPoints: number;
  onMaxPointsChange?: (total: number) => void;
}

function parseItems(value: string): ChecklistItem[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  // Try JSON format first: [{"label":"...", "points": N}, ...]
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].label === "string") {
      return parsed.map((p: { label: string; points?: number }) => ({
        label: p.label,
        points: typeof p.points === "number" ? p.points : 1,
      }));
    }
  } catch {
    // Not JSON
  }
  // Fallback: newline-separated plain text
  return trimmed
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => ({ label, points: 1 }));
}

function serializeItems(items: ChecklistItem[]): string {
  if (items.length === 0) return "";
  return JSON.stringify(items.map((i) => ({ label: i.label, points: i.points })));
}

export function ChecklistItemsEditor({
  value,
  onChange,
  maxPoints,
  onMaxPointsChange,
}: ChecklistItemsEditorProps) {
  const items = parseItems(value);

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPoints, setEditPoints] = useState(1);
  const [newLabel, setNewLabel] = useState("");
  const [newPoints, setNewPoints] = useState(1);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const totalPoints = items.reduce((s, i) => s + i.points, 0);

  const update = (newItems: ChecklistItem[]) => {
    onChange(serializeItems(newItems));
    const newTotal = newItems.reduce((s, i) => s + i.points, 0);
    if (onMaxPointsChange && newTotal !== totalPoints) {
      onMaxPointsChange(newTotal);
    }
  };

  const addItem = () => {
    if (!newLabel.trim()) return;
    update([...items, { label: newLabel.trim(), points: newPoints }]);
    setNewLabel("");
    setNewPoints(1);
    setTimeout(() => newInputRef.current?.focus(), 50);
  };

  const removeItem = (idx: number) => {
    update(items.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditLabel(items[idx].label);
    setEditPoints(items[idx].points);
  };

  const confirmEdit = () => {
    if (editingIdx === null) return;
    if (!editLabel.trim()) {
      removeItem(editingIdx);
    } else {
      const next = [...items];
      next[editingIdx] = { label: editLabel.trim(), points: editPoints };
      update(next);
    }
    setEditingIdx(null);
  };

  const cancelEdit = () => setEditingIdx(null);

  const updateItemPoints = (idx: number, pts: number) => {
    const next = [...items];
    next[idx] = { ...next[idx], points: Math.max(0, pts) };
    update(next);
  };

  // Drag handlers
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragEnd = () => { setDragIdx(null); setDropIdx(null); };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDropIdx(idx); };
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
          key={`${idx}-${item.label}`}
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

          {editingIdx === idx ? (
            <>
              <Input
                type="number"
                min={0}
                value={editPoints}
                onChange={(e) => setEditPoints(parseInt(e.target.value) || 0)}
                className="h-7 w-14 text-xs text-center shrink-0"
              />
              <span className="text-[10px] text-muted-foreground shrink-0">pt{editPoints > 1 ? "s" : ""}</span>
              <Input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="h-7 text-sm flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); confirmEdit(); }
                  if (e.key === "Escape") cancelEdit();
                }}
              />
              <ActionIconButton
                variant="success"
                label="Enregistrer la modification"
                className="h-6 w-6 shrink-0"
                onClick={confirmEdit}
              >
                <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
              </ActionIconButton>
              <ActionIconButton variant="ghost" label="Annuler" className="h-6 w-6 shrink-0" onClick={cancelEdit}>
                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
              </ActionIconButton>
            </>
          ) : (
            <>
              <Input
                type="number"
                min={0}
                value={item.points}
                onChange={(e) => updateItemPoints(idx, parseInt(e.target.value) || 0)}
                className="h-7 w-14 text-xs text-center shrink-0"
              />
              <span className="text-[10px] text-muted-foreground shrink-0">pt{item.points > 1 ? "s" : ""}</span>
              <span className="text-sm flex-1 min-w-0 truncate">{item.label}</span>
              <ActionIconButton
                variant="edit"
                label="Modifier"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => startEdit(idx)}
              >
                <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
              </ActionIconButton>
              <ActionIconButton
                variant="destructive"
                label="Supprimer cette ligne"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeItem(idx)}
              >
                <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
              </ActionIconButton>
            </>
          )}
        </div>
      ))}

      {/* Add new item */}
      <div className="flex items-center gap-2 pt-1">
        <Input
          type="number"
          min={0}
          value={newPoints}
          onChange={(e) => setNewPoints(parseInt(e.target.value) || 0)}
          className="h-8 w-14 text-xs text-center shrink-0"
        />
        <span className="text-[10px] text-muted-foreground shrink-0">pts</span>
        <Input
          ref={newInputRef}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nouveau check…"
          className="h-8 text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addItem(); }
          }}
        />
        <ActionIconButton
          variant="default"
          label="Ajouter une ligne"
          className="h-8 w-8 shrink-0"
          onClick={addItem}
          disabled={!newLabel.trim()}
        >
          <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
        </ActionIconButton>
      </div>

      {items.length > 0 && (
        <p className="text-[11px] text-muted-foreground font-medium">
          {items.length} élément{items.length > 1 ? "s" : ""} · Total : {totalPoints} pt{totalPoints > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
