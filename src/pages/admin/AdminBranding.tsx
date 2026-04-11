import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera, faFloppyDisk, faMoon, faSpinner, faSun } from "@fortawesome/free-solid-svg-icons";
import { resolveAvatarFileMeta } from "@/lib/avatarStorage";

type AppSettingsRow = {
  app_name: string;
  description: string | null;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  icon_512_light_url: string | null;
  icon_512_dark_url: string | null;
};

type BrandingSlot = "logo_light" | "logo_dark" | "favicon" | "icon512_light" | "icon512_dark";

const FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg";

function slotToPathSuffix(slot: BrandingSlot): string {
  switch (slot) {
    case "logo_light":
      return "logo_light";
    case "logo_dark":
      return "logo_dark";
    case "favicon":
      return "favicon";
    case "icon512_light":
      return "icon512_light";
    case "icon512_dark":
      return "icon512_dark";
    default:
      return "asset";
  }
}

async function uploadBrandingAsset(file: File, slot: BrandingSlot): Promise<string | null> {
  if (file.size > 5 * 1024 * 1024) {
    toast.error("Fichier trop volumineux (max. 5 Mo).");
    return null;
  }
  const meta = resolveAvatarFileMeta(file);
  if (!meta) {
    toast.error("Format d’image non pris en charge (JPG, PNG, WebP ou SVG).");
    return null;
  }
  const suffix = slotToPathSuffix(slot);
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

function pickUrlForSlot(
  form: AppSettingsRow,
  slot: BrandingSlot,
  url: string,
): AppSettingsRow {
  switch (slot) {
    case "logo_light":
      return { ...form, logo_light_url: url };
    case "logo_dark":
      return { ...form, logo_dark_url: url };
    case "favicon":
      return { ...form, favicon_url: url };
    case "icon512_light":
      return { ...form, icon_512_light_url: url };
    case "icon512_dark":
      return { ...form, icon_512_dark_url: url };
    default:
      return form;
  }
}

/**
 * Page Identité : nom, description, logo (clair / sombre), favicon, icône 512 (clair / sombre).
 */
export default function AdminBranding() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppSettingsRow>({
    app_name: "DynaPerf",
    description: "",
    logo_light_url: null,
    logo_dark_url: null,
    favicon_url: null,
    icon_512_light_url: null,
    icon_512_dark_url: null,
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
        logo_light_url: data.logo_light_url ?? data.logo_url,
        logo_dark_url: data.logo_dark_url,
        favicon_url: data.favicon_url,
        icon_512_light_url: data.icon_512_light_url ?? data.icon_512_url,
        icon_512_dark_url: data.icon_512_dark_url,
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
        logo_light_url: form.logo_light_url,
        logo_dark_url: form.logo_dark_url,
        logo_url: form.logo_light_url,
        favicon_url: form.favicon_url,
        icon_512_light_url: form.icon_512_light_url,
        icon_512_dark_url: form.icon_512_dark_url,
        icon_512_url: form.icon_512_light_url,
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

  const onPick = async (file: File | undefined, slot: BrandingSlot) => {
    if (!file) return;
    const url = await uploadBrandingAsset(file, slot);
    if (!url) return;
    setForm((f) => pickUrlForSlot(f, slot, url));
    toast.success("Fichier envoyé — enregistrez pour appliquer partout.");
  };

  const visualRow = (
    slot: BrandingSlot,
    label: string,
    url: string | null,
    themeIcon: typeof faSun,
    themeHint: string,
  ) => (
    <div key={slot} className="space-y-2">
      <Label className="flex items-center gap-2">
        <FontAwesomeIcon icon={themeIcon} className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        {label}
        <span className="text-[10px] font-normal text-muted-foreground">({themeHint})</span>
      </Label>
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
            accept={FILE_ACCEPT}
            className="hidden"
            onChange={(e) => void onPick(e.target.files?.[0], slot)}
          />
          <Button type="button" variant="outline" size="sm" className="rounded-md" asChild>
            <span>Choisir…</span>
          </Button>
        </label>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="app-page-shell-wide py-12 text-center text-muted-foreground text-sm">Chargement…</div>
    );
  }

  return (
    <div className="app-page-shell-wide min-w-0 w-full max-w-full space-y-6 pb-8">
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
          <CardDescription>
            Stockage public <code className="text-xs">avatars/branding/…</code> — PNG, JPG, WebP ou SVG recommandés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Logo</p>
            <div className="grid gap-6 sm:grid-cols-2">
              {visualRow("logo_light", "Logo", form.logo_light_url, faSun, "clair")}
              {visualRow("logo_dark", "Logo", form.logo_dark_url, faMoon, "sombre")}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-3">Icône 512</p>
            <div className="grid gap-6 sm:grid-cols-2">
              {visualRow("icon512_light", "Icône 512", form.icon_512_light_url, faSun, "clair")}
              {visualRow("icon512_dark", "Icône 512", form.icon_512_dark_url, faMoon, "sombre")}
            </div>
          </div>

          <div className="border-t border-border/60 pt-6">
            <div className="space-y-2 sm:max-w-xs">
              <Label>Favicon</Label>
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                  {form.favicon_url ? (
                    <img src={form.favicon_url} alt="" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <FontAwesomeIcon icon={faCamera} className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept={FILE_ACCEPT}
                    className="hidden"
                    onChange={(e) => void onPick(e.target.files?.[0], "favicon")}
                  />
                  <Button type="button" variant="outline" size="sm" className="rounded-md" asChild>
                    <span>Choisir…</span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
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
