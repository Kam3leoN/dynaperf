import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faFloppyDisk, faCamera } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import { uploadUserAvatarToBucket, withAvatarCacheBust } from "@/lib/avatarStorage";

export default function Profile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, title, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? "");
        setTitle(data?.title ?? "");
        setAvatarUrl(data?.avatar_url ?? null);
        setLoading(false);
      });
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const up = await uploadUserAvatarToBucket(user.id, file);
    if (!up.ok) {
      toast.error((up as any).message);
      return;
    }
    const url = withAvatarCacheBust(up.publicUrl);
    const { error: upErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    if (upErr) {
      toast.error(upErr.message || "Impossible d'enregistrer l'avatar");
      return;
    }
    setAvatarUrl(url);
    toast.success("Avatar mis à jour");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), title: title.trim() })
      .eq("user_id", user.id);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else toast.success("Profil mis à jour");
    setSaving(false);
  };

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (loading) return <AppLayout><p className="text-muted-foreground p-8">Chargement…</p></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FontAwesomeIcon icon={faUser} className="h-4 w-4 text-primary" />
              Mon profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-lg border border-border">
                    {initials || "?"}
                  </div>
                )}
                <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <FontAwesomeIcon icon={faCamera} className="h-4 w-4 text-white" />
                  <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{displayName || "Utilisateur"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nom complet</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Prénom NOM" className="h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Titre / Fonction</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Directeur d'agence" className="h-10 text-sm" />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
