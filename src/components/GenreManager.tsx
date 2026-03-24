import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMars, faVenus, faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PrenomGenre {
  id: string;
  prenom: string;
  genre: string;
}

interface GenreManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function GenreManager({ open, onOpenChange, onUpdate }: GenreManagerProps) {
  const [items, setItems] = useState<PrenomGenre[]>([]);
  const [search, setSearch] = useState("");
  const [newPrenom, setNewPrenom] = useState("");
  const [newGenre, setNewGenre] = useState("M");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("prenoms_genre" as any).select("*").order("prenom");
    if (data) setItems(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleAdd = async () => {
    const prenom = newPrenom.trim();
    if (!prenom) return;
    // Title case
    const formatted = prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
    const { error } = await supabase.from("prenoms_genre" as any).insert({ prenom: formatted, genre: newGenre } as any);
    if (error) {
      if (error.code === "23505") toast.error("Ce prénom existe déjà");
      else toast.error("Erreur : " + error.message);
      return;
    }
    toast.success(`${formatted} ajouté comme ${newGenre === "M" ? "Homme" : "Femme"}`);
    setNewPrenom("");
    load();
    onUpdate();
  };

  const handleDelete = async (item: PrenomGenre) => {
    const { error } = await supabase.from("prenoms_genre" as any).delete().eq("id", item.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(`${item.prenom} supprimé`);
    load();
    onUpdate();
  };

  const handleToggleGenre = async (item: PrenomGenre) => {
    const newG = item.genre === "M" ? "F" : "M";
    const { error } = await supabase.from("prenoms_genre" as any).update({ genre: newG } as any).eq("id", item.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    load();
    onUpdate();
  };

  const filtered = items.filter(i =>
    !search || i.prenom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 sm:w-96 flex flex-col">
        <SheetHeader>
          <SheetTitle>Gestion des prénoms</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-2 mt-4">
          <Input
            value={newPrenom}
            onChange={(e) => setNewPrenom(e.target.value)}
            placeholder="Nouveau prénom"
            className="h-9 text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Select value={newGenre} onValueChange={setNewGenre}>
            <SelectTrigger className="h-9 w-20 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">
                <FontAwesomeIcon icon={faMars} className="h-3 w-3 text-blue-500" />
              </SelectItem>
              <SelectItem value="F">
                <FontAwesomeIcon icon={faVenus} className="h-3 w-3 text-pink-300" />
              </SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} className="h-9 px-2.5">
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="h-8 text-sm mt-2"
        />

        <p className="text-[10px] text-muted-foreground mt-2">
          {filtered.length} prénom{filtered.length > 1 ? "s" : ""} — Cliquez sur l'icône pour changer le genre
        </p>

        <div className="flex-1 overflow-y-auto mt-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8"></TableHead>
                  <TableHead className="text-xs">Prénom</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="py-1">
                      <button
                        onClick={() => handleToggleGenre(item)}
                        className="p-1 rounded hover:bg-secondary transition-colors"
                        title="Changer le genre"
                      >
                        <FontAwesomeIcon
                          icon={item.genre === "M" ? faMars : faVenus}
                          className={`h-3.5 w-3.5 ${item.genre === "M" ? "text-blue-500" : "text-pink-300"}`}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="text-sm py-1">{item.prenom}</TableCell>
                    <TableCell className="py-1">
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                        title="Supprimer"
                      >
                        <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3 text-destructive" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
