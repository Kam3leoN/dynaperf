import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { ActionIconButton } from "@/components/ActionIconButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type QrShapeKind = Database["public"]["Tables"]["qr_shape_library"]["Row"]["kind"];
type QrShapeRow = Database["public"]["Tables"]["qr_shape_library"]["Row"];

const KIND_LABELS: Record<QrShapeKind, string> = {
  dot: "Modules (points)",
  corner: "Repères (coins)",
  cover: "Voiles / textures",
};

export default function AdminQrShapes() {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdmin(user);
  const qc = useQueryClient();

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-qr-shape-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_shape_library")
        .select("*")
        .order("kind")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as QrShapeRow[];
    },
  });

  const byKind = useMemo(() => {
    const d = rows.filter((r) => r.kind === "dot");
    const c = rows.filter((r) => r.kind === "corner");
    const v = rows.filter((r) => r.kind === "cover");
    return { dot: d, corner: c, cover: v };
  }, [rows]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QrShapeRow | null>(null);
  const [formKind, setFormKind] = useState<QrShapeKind>("dot");
  const [formName, setFormName] = useState("");
  const [formSvg, setFormSvg] = useState("");
  const [formLegacy, setFormLegacy] = useState("");
  const [formSort, setFormSort] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const openCreate = (kind: QrShapeKind) => {
    setEditing(null);
    setFormKind(kind);
    setFormName("");
    setFormSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 6" fill="currentColor"><rect width="6" height="6"/></svg>');
    setFormLegacy("");
    setFormSort(0);
    setFormActive(true);
    setDialogOpen(true);
  };

  const openEdit = (r: QrShapeRow) => {
    setEditing(r);
    setFormKind(r.kind);
    setFormName(r.name);
    setFormSvg(r.svg_markup);
    setFormLegacy(r.legacy_key ?? "");
    setFormSort(r.sort_order);
    setFormActive(r.is_active);
    setDialogOpen(true);
  };

  const save = async () => {
    const name = formName.trim();
    const svg = formSvg.trim();
    if (!name || !svg || !svg.includes("<svg")) {
      toast.error("Nom et SVG valide requis.");
      return;
    }
    if (!isSuperAdmin) {
      toast.error("Réservé aux super administrateurs.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind: formKind,
        name,
        svg_markup: svg,
        legacy_key: formLegacy.trim() || null,
        sort_order: formSort,
        is_active: formActive,
      };
      if (editing) {
        const { error } = await supabase.from("qr_shape_library").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Forme mise à jour.");
      } else {
        const { error } = await supabase.from("qr_shape_library").insert(payload);
        if (error) throw error;
        toast.success("Forme créée.");
      }
      setDialogOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin-qr-shape-library"] });
      await qc.invalidateQueries({ queryKey: ["qr-shape-library"] });
      void refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: QrShapeRow) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Supprimer « ${r.name} » ?`)) return;
    const { error } = await supabase.from("qr_shape_library").delete().eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Supprimé.");
    await qc.invalidateQueries({ queryKey: ["admin-qr-shape-library"] });
    await qc.invalidateQueries({ queryKey: ["qr-shape-library"] });
    void refetch();
  };

  const renderTable = (list: QrShapeRow[], kind: QrShapeKind) => (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{KIND_LABELS[kind]}</CardTitle>
          <CardDescription>{list.length} entrée(s)</CardDescription>
        </div>
        {isSuperAdmin ? (
          <Button type="button" size="sm" className="gap-2" onClick={() => openCreate(kind)}>
            <FontAwesomeIcon icon={faPlus} className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="overflow-x-auto pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune entrée.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Aperçu</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="hidden md:table-cell">Clé héritage</TableHead>
                <TableHead className="w-20">Tri</TableHead>
                <TableHead className="w-24">Actif</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => {
                const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.svg_markup)}`;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <img src={src} alt="" className="h-10 w-10 object-contain" />
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                      {r.legacy_key ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{r.sort_order}</TableCell>
                    <TableCell>{r.is_active ? "oui" : "non"}</TableCell>
                    <TableCell className="text-right">
                      {isSuperAdmin ? (
                        <div className="flex justify-end gap-1">
                          <ActionIconButton variant="edit" label="Modifier" onClick={() => openEdit(r)}>
                            <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5" />
                          </ActionIconButton>
                          <ActionIconButton variant="destructive" label="Supprimer cette forme" onClick={() => void remove(r)}>
                            <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                          </ActionIconButton>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Bibliothèque de formes QR</h1>
        <p className="text-sm text-muted-foreground">
          Modules, repères et voiles utilisés par le générateur. Lecture pour les administrateurs ; création, modification et suppression
          réservées aux <span className="font-medium text-foreground">super administrateurs</span>.
        </p>
      </div>

      <Tabs defaultValue="dot" className="w-full">
        <TabsList className="flex w-full flex-wrap gap-1">
          <TabsTrigger value="dot">Modules</TabsTrigger>
          <TabsTrigger value="corner">Repères</TabsTrigger>
          <TabsTrigger value="cover">Voiles</TabsTrigger>
        </TabsList>
        <TabsContent value="dot" className="mt-4">
          {renderTable(byKind.dot, "dot")}
        </TabsContent>
        <TabsContent value="corner" className="mt-4">
          {renderTable(byKind.corner, "corner")}
        </TabsContent>
        <TabsContent value="cover" className="mt-4">
          {renderTable(byKind.cover, "cover")}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la forme" : "Nouvelle forme"}</DialogTitle>
            <DialogDescription>Document SVG complet (balise racine &lt;svg&gt;).</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formKind}
                disabled={Boolean(editing)}
                onChange={(e) => setFormKind(e.target.value as QrShapeKind)}
              >
                <option value="dot">Module (point de données)</option>
                <option value="corner">Repère (grand coin)</option>
                <option value="cover">Voile / texture</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qs-name">Nom affiché</Label>
              <Input id="qs-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex. Module arrondi" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qs-legacy">Clé héritage (optionnel, unique)</Label>
              <Input
                id="qs-legacy"
                value={formLegacy}
                onChange={(e) => setFormLegacy(e.target.value)}
                placeholder="ex. dot:16"
                disabled={Boolean(editing?.legacy_key)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="qs-sort">Ordre de tri</Label>
                <Input
                  id="qs-sort"
                  type="number"
                  value={formSort}
                  onChange={(e) => setFormSort(Number(e.target.value))}
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch id="qs-act" checked={formActive} onCheckedChange={setFormActive} />
                <Label htmlFor="qs-act">Actif</Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qs-svg">SVG</Label>
              <Textarea
                id="qs-svg"
                value={formSvg}
                onChange={(e) => setFormSvg(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
                spellCheck={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || !isSuperAdmin}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
