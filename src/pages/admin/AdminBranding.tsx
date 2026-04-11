import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faFloppyDisk, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { resolveAvatarFileMeta } from "@/lib/avatarStorage";

type AppSettingsRow = {
  app_name: string;
  description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  icon_512_url: string | null;
};

async function uploadBrandingAsset(file: File, slot: "logo" | "favicon" | "icon512"): Promise<string | null> {
  if (file.size > 5 * 1024 * 1024) {
    toast.error("Fichier trop volumineux (max. 5 Mo).");
    return null;
  }
  const meta = resolveAvatarFileMeta(file);
  if (!meta) {
    toast.error("Format d’image non pris en charge (JPG, PNG, WebP).");
    return null;
  }
  const suffix = slot === "icon512" ? "icon512" : slot;
  const path = `branding/${suffix}.${meta.ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: meta.contentType,
    cacheControl: "3600",
  });
  if (error) {
    toast.error(error.message || "Échec upload.");
    return null;
  }
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

/**
 * Page Identité : nom, description, logo, favicon, icône PWA / grand format.
 */
export default function AdminBranding() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppSettingsRow>({
    app_name: "DynaPerf",
    description: "",
    logo_url: null,
    favicon_url: null,
    icon_512_url: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
    if (error) {
      toast.error(error.message);
    } else if (data) {
      setForm({
        app_name: data.app_name ?? "DynaPerf",
        description: data.description,
        logo_url: data.logo_url,
        favicon_url: data.favicon_url,
        icon_512_url: data.icon_512_url,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveText = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({
        app_name: form.app_name.trim() || "DynaPerf",
        description: form.description?.trim() || null,
        logo_url: form.logo_url,
        favicon_url: form.favicon_url,
        icon_512_url: form.icon_512_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) toast.error(error.message);
    else {
      toast.success("Identité enregistrée");
      if (form.app_name.trim()) document.title = form.app_name.trim();
    }
    setSaving(false);
  };

  const onPick = async (file: File | undefined, slot: "logo" | "favicon" | "icon512") => {
    if (!file) return;
    const url = await uploadBrandingAsset(file, slot);
    if (!url) return;
    setForm((f) => {
      if (slot === "logo") return { ...f, logo_url: url };
      if (slot === "favicon") return { ...f, favicon_url: url };
      return { ...f, icon_512_url: url };
    });
    toast.success("Fichier envoyé — enregistrez pour appliquer partout.");
  };

  if (loading) {
    return (
      <div className="app-page-shell py-12 text-center text-muted-foreground text-sm">Chargement…</div>
    );
  }

  return (
    <div className="app-page-shell min-w-0 w-full max-w-full space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Identité de l’application</h1>
        <p className="text-sm text-muted-foreground mt-1">Nom affiché, favicon et visuels pour l’ensemble du site.</p>
      </div>

      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle>Textes</CardTitle>
          <CardDescription>Titre de la fenêtre, partages sociaux et description courte.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 max-w-xl">
          <div className="grid gap-2">
            <Label htmlFor="app_name">Nom de l’application</Label>
            <Input
              id="app_name"
              value={form.app_name}
              onChange={(e) => setForm((f) => ({ ...f, app_name: e.target.value }))}
              placeholder="DynaPerf"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="app_desc">Description</Label>
            <Input
              id="app_desc"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Sous-titre ou baseline"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle>Visuels</CardTitle>
          <CardDescription>Stockage public `avatars/branding/…` — PNG, JPG ou WebP recommandés.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          {[
            { key: "logo" as const, label: "Logo", url: form.logo_url },
            { key: "favicon" as const, label: "Favicon", url: form.favicon_url },
            { key: "icon512" as const, label: "Icône 512", url: form.icon_512_url },
          ].map(({ key, label, url }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                  {url ? (
                    <img src={url} alt="" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <FontAwesomeIcon icon={faCamera} className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => void onPick(e.target.files?.[0], key)}
                  />
                  <Button type="button" variant="outline" size="sm" className="rounded-md" asChild>
                    <span>Choisir…</span>
                  </Button>
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={() => void saveText()} disabled={saving} className="gap-2 rounded-md">
          {saving ? <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" /> : <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />}
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
