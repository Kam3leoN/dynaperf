import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ActionIconButton } from "@/components/ActionIconButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faSpinner, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import type { Database } from "@/integrations/supabase/types";

type AssetType = Database["public"]["Tables"]["expression_assets"]["Row"]["asset_type"];

function extForAsset(file: File, assetType: AssetType): string {
  const n = file.name.toLowerCase();
  if (assetType === "sound") {
    if (file.type.includes("mpeg") || n.endsWith(".mp3")) return "mp3";
    if (file.type.includes("wav") || n.endsWith(".wav")) return "wav";
    if (file.type.includes("ogg") || n.endsWith(".ogg")) return "ogg";
    return "audio";
  }
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".webp")) return "webp";
  if (n.endsWith(".gif")) return "gif";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "jpg";
  return "img";
}

/**
 * Bibliothèque d’assets d’expression (emoji, autocollant, son) — stockage `avatars/expression/…`.
 */
export default function AdminExpression() {
  const [rows, setRows] = useState<Database["public"]["Tables"]["expression_assets"]["Row"][]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [assetType, setAssetType] = useState<AssetType>("sticker");
  const [label, setLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expression_assets")
      .select("*")
      .order("asset_type")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Database["public"]["Tables"]["expression_assets"]["Row"][]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addAsset = async (file: File | undefined) => {
    if (!file || !label.trim()) {
      toast.error("Indiquez un libellé et choisissez un fichier.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max. 8 Mo).");
      return;
    }
    setUploading(true);
    const id = crypto.randomUUID();
    const ext = extForAsset(file, assetType);
    const path = `expression/${assetType}/${id}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
    });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: insErr } = await supabase.from("expression_assets").insert({
      asset_type: assetType,
      label: label.trim(),
      storage_path: path,
      mime_type: file.type || null,
      sort_order: rows.filter((r) => r.asset_type === assetType).length,
    });
    if (insErr) {
      toast.error(insErr.message);
      await supabase.storage.from("avatars").remove([path]);
    } else {
      toast.success("Asset ajouté");
      setLabel("");
      void load();
    }
    setUploading(false);
  };

  const removeRow = async (row: Database["public"]["Tables"]["expression_assets"]["Row"]) => {
    if (!confirm(`Retirer « ${row.label} » ?`)) return;
    const { error } = await supabase.from("expression_assets").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from("avatars").remove([row.storage_path]);
    toast.success("Asset supprimé");
    void load();
  };

  return (
    <div className="app-page-shell-wide min-w-0 w-full max-w-full space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Expression</h1>
        <p className="text-sm text-muted-foreground mt-1">Emojis, autocollants et sons pour enrichir la messagerie.</p>
      </div>

      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle>Ajouter un média</CardTitle>
          <CardDescription>Fichiers publics sous <span className="font-mono">avatars/expression/&lt;type&gt;/…</span></CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="grid gap-2 min-w-[160px]">
            <Label>Type</Label>
            <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="emoji">Emoji</SelectItem>
                <SelectItem value="sticker">Autocollant</SelectItem>
                <SelectItem value="sound">Son</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 flex-1 min-w-[200px]">
            <Label htmlFor="expr-label">Libellé</Label>
            <Input id="expr-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom affiché" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expr-file">Fichier</Label>
            <div className="relative inline-flex">
              <input
                id="expr-file"
                type="file"
                className="absolute inset-0 z-10 cursor-pointer opacity-0 w-full max-w-[220px] disabled:pointer-events-none"
                accept={assetType === "sound" ? "audio/*,.mp3,.wav,.ogg" : "image/*,.png,.webp,.gif,.jpg,.jpeg"}
                onChange={(e) => void addAsset(e.target.files?.[0])}
                disabled={uploading}
              />
              <Button type="button" variant="outline" size="sm" className="rounded-md gap-2 pointer-events-none" disabled={uploading}>
                {uploading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin h-4 w-4" /> : <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />}
                Téléverser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground text-sm">Chargement…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase">Type</TableHead>
                <TableHead className="text-xs uppercase">Libellé</TableHead>
                <TableHead className="text-xs uppercase">Aperçu</TableHead>
                <TableHead className="text-xs uppercase w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const pub = supabase.storage.from("avatars").getPublicUrl(row.storage_path).data.publicUrl;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm capitalize">{row.asset_type}</TableCell>
                    <TableCell className="text-sm font-medium">{row.label}</TableCell>
                    <TableCell>
                      {row.asset_type === "sound" ? (
                        <audio controls className="h-8 max-w-[200px]" src={pub} />
                      ) : (
                        <img src={pub} alt="" className="h-10 w-10 object-contain rounded border border-border/60 bg-muted/20" />
                      )}
                    </TableCell>
                    <TableCell>
                      <ActionIconButton
                        variant="destructive"
                        label="Supprimer cet élément"
                        onClick={() => void removeRow(row)}
                      >
                        <FontAwesomeIcon icon={faTrashCan} className="h-4 w-4" />
                      </ActionIconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
