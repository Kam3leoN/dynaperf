import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { usePresenceStatusDefinitions } from "@/contexts/PresenceStatusDefinitionsContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { preparePresenceSvgMarkup } from "@/lib/presenceSvg";
import { toast } from "sonner";

type Row = Database["public"]["Tables"]["presence_status_definitions"]["Row"];

export default function AdminPresenceStatuses() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin(user);
  const qc = useQueryClient();
  const { invalidate } = usePresenceStatusDefinitions();

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-presence-status-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presence_status_definitions")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formSort, setFormSort] = useState(0);
  const [formSvg, setFormSvg] = useState("");
  const [formColor, setFormColor] = useState("");
  const [formShowAvatar, setFormShowAvatar] = useState(true);
  const [saving, setSaving] = useState(false);

  const openEdit = (r: Row) => {
    setEditing(r);
    setFormLabel(r.label_fr);
    setFormSort(r.sort_order);
    setFormSvg(r.svg_markup);
    setFormColor(r.fill_color ?? "");
    setFormShowAvatar(r.show_on_avatar);
    setDialogOpen(true);
  };

  const previewHtml = useMemo(() => {
    const t = formSvg.trim();
    if (!t.includes("<svg")) return "";
    return preparePresenceSvgMarkup(t);
  }, [formSvg]);

  const save = async () => {
    if (!editing) return;
    const label = formLabel.trim();
    const svg = formSvg.trim();
    if (!label) {
      toast.error("Libellé requis.");
      return;
    }
    if (formShowAvatar && svg && !svg.includes("<svg")) {
      toast.error("Le SVG doit contenir une balise svg.");
      return;
    }
    if (!isAdmin) {
      toast.error("Réservé aux administrateurs.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("presence_status_definitions")
        .update({
          label_fr: label,
          sort_order: formSort,
          svg_markup: formShowAvatar ? svg : "",
          fill_color: formColor.trim() ? formColor.trim() : null,
          show_on_avatar: formShowAvatar,
        })
        .eq("status_key", editing.status_key);
      if (error) throw error;
      toast.success("Statut enregistré.");
      setDialogOpen(false);
      await refetch();
      invalidate();
      void qc.invalidateQueries({ queryKey: ["presence-status-definitions"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>;
  }

  return (
    <div className="app-page-shell-wide min-w-0 w-full max-w-full space-y-4 pb-8">
      <Card className="rounded-2xl border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Statuts de présence</CardTitle>
          <CardDescription>
            Libellés, couleurs de remplissage et SVG affichés sur les avatars et dans le menu profil. La clé technique
            (<span className="font-mono text-xs">status_key</span>) est fixe ; seuls le contenu et l’ordre sont modifiables.
            « Invisible » n’affiche pas d’indicateur sur l’avatar lorsque cette option est désactivée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Clé</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="w-20 text-center">Ordre</TableHead>
                <TableHead className="w-24 text-center">Avatar</TableHead>
                <TableHead className="w-32">Aperçu</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.status_key}>
                  <TableCell className="font-mono text-xs">{r.status_key}</TableCell>
                  <TableCell className="text-sm">{r.label_fr}</TableCell>
                  <TableCell className="text-center text-sm">{r.sort_order}</TableCell>
                  <TableCell className="text-center text-sm">{r.show_on_avatar ? "Oui" : "Non"}</TableCell>
                  <TableCell>
                    {r.svg_markup.trim() && r.fill_color ? (
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center [&_svg]:h-full [&_svg]:w-full"
                        style={{ color: r.fill_color, filter: "drop-shadow(0 0 0 1px hsl(var(--background)))" }}
                        dangerouslySetInnerHTML={{ __html: preparePresenceSvgMarkup(r.svg_markup) }}
                        aria-hidden
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(r)}>
                      <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5 mr-1.5" />
                      Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier « {editing?.status_key} »</DialogTitle>
            <DialogDescription>Ajustez le libellé, la couleur de remplissage (SVG) et le code SVG.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="ps-label">Libellé (FR)</Label>
              <Input id="ps-label" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ps-sort">Ordre d’affichage</Label>
              <Input
                id="ps-sort"
                type="number"
                value={formSort}
                onChange={(e) => setFormSort(Number(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
              <Label htmlFor="ps-avatar" className="cursor-pointer">
                Indicateur sur l’avatar
              </Label>
              <Switch id="ps-avatar" checked={formShowAvatar} onCheckedChange={setFormShowAvatar} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ps-color">Couleur de remplissage (hex)</Label>
              <Input
                id="ps-color"
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                placeholder="#3ba45c"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ps-svg">SVG</Label>
              <Textarea
                id="ps-svg"
                value={formSvg}
                onChange={(e) => setFormSvg(e.target.value)}
                rows={8}
                className="font-mono text-xs"
                disabled={!formShowAvatar}
              />
            </div>
            {previewHtml && formShowAvatar ? (
              <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">Aperçu</span>
                <span
                  className="inline-flex h-10 w-10 items-center justify-center [&_svg]:h-full [&_svg]:w-full"
                  style={{
                    color: formColor.trim() || "#888",
                    filter: "drop-shadow(0 0 0 2px hsl(var(--background)))",
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                  aria-hidden
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
