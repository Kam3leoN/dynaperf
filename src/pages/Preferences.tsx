import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faMoon, faSun, faSave, faFingerprint, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useUserPreferences, type NotifPref } from "@/hooks/useUserPreferences";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  isWebAuthnSupported,
  hasStoredCredential,
  registerWebAuthnCredential,
  removeStoredCredential,
} from "@/services/WebAuthnService";
import { storeBiometricRefreshToken } from "@/services/BiometricSessionService";

export default function Preferences() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { user } = useAuth();
  const { preferences, loading: prefsLoading, savePreferences } = useUserPreferences();

  const [notifItems, setNotifItems] = useState<NotifPref[]>([]);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Synchronise l'état local avec les préférences chargées
  useEffect(() => {
    if (!prefsLoading) {
      setNotifItems(preferences.notifications);
      setBiometricEnabled(preferences.biometricEnabled && hasStoredCredential());
    }
  }, [prefsLoading, preferences]);

  // Vérifie le support WebAuthn au montage
  useEffect(() => {
    isWebAuthnSupported().then(setWebauthnSupported);
  }, []);

  const toggleNotif = (index: number, channel: "email" | "push") => {
    setNotifItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [channel]: !item[channel] } : item
      )
    );
  };

  /** Active l'authentification biométrique */
  const enableBiometric = async () => {
    if (!user) return;
    setBiometricLoading(true);
    try {
      // IMPORTANT: déclencher WebAuthn immédiatement après l'action utilisateur
      // (évite la perte d'activation utilisateur sur certains navigateurs desktop/Windows Hello)
      const result = await registerWebAuthnCredential(
        user.id,
        user.email || "",
        (user.user_metadata?.display_name as string) || user.email || ""
      );

      if (result.success) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.refresh_token) {
          storeBiometricRefreshToken(sessionData.session.refresh_token);
        }

        await supabase.from("webauthn_credentials").insert({
          user_id: user.id,
          credential_id: result.credentialId,
          public_key: result.publicKey,
          user_email: user.email || "",
          device_name: navigator.userAgent.slice(0, 100),
        } as any);

        setBiometricEnabled(true);
        toast.success("Connexion biométrique activée !");
      }
    } catch (error: any) {
      if (error.message?.includes("prévisualisation intégrée")) {
        toast.error(error.message);
      } else if (error.message?.includes("non confirmée")) {
        toast.info("Activation non confirmée. Vérifiez Windows Hello puis réessayez.");
      } else if (error.message?.includes("annulée")) {
        toast.info("Activation annulée.");
      } else {
        toast.error(error.message);
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  /** Désactive l'authentification biométrique */
  const disableBiometric = async () => {
    removeStoredCredential();
    if (user) {
      await supabase
        .from("webauthn_credentials")
        .delete()
        .eq("user_id", user.id) as any;
    }
    setBiometricEnabled(false);
    toast.success("Connexion biométrique désactivée.");
  };

  /** Bascule l'état biométrique via un switch */
  const toggleBiometric = async (checked: boolean) => {
    if (checked) {
      await enableBiometric();
    } else {
      await disableBiometric();
    }
  };

  /** Sauvegarde toutes les préférences */
  const save = async () => {
    setSaving(true);
    await savePreferences({
      notifications: notifItems,
      biometricEnabled,
    });
    setSaving(false);
    toast.success("Préférences enregistrées");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FontAwesomeIcon icon={faGear} className="h-5 w-5 text-primary" />
            Préférences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personnalisez votre expérience DynaPerf.
          </p>
        </div>

        {/* Apparence */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Apparence</CardTitle>
            <CardDescription>Choisissez le thème de l'interface.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-md px-1 py-3">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={isDark ? faMoon : faSun} className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm cursor-default">Mode sombre</Label>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Biométrie */}
        {webauthnSupported && !biometricLoading && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FontAwesomeIcon icon={faFingerprint} className="h-4 w-4 text-primary" />
                Connexion biométrique
              </CardTitle>
              <CardDescription>
                Utilisez votre empreinte digitale ou Face ID pour vous connecter rapidement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-md px-1 py-3">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faFingerprint} className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm cursor-default">
                    {biometricEnabled ? "Biométrie activée" : "Activer la biométrie"}
                  </Label>
                </div>
                <Switch checked={biometricEnabled} onCheckedChange={toggleBiometric} />
              </div>
            </CardContent>
          </Card>
        )}

        {webauthnSupported && biometricLoading && (
          <Card>
            <CardContent className="flex items-center justify-center py-8 gap-3">
              <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Enregistrement biométrique…</span>
            </CardContent>
          </Card>
        )}

        {/* Notifications settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription>Activez ou désactivez chaque canal pour chaque type de notification.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_60px_60px] gap-2 mb-3 px-1">
              <span className="text-xs font-medium text-muted-foreground">Type</span>
              <span className="text-xs font-medium text-muted-foreground text-center">Email</span>
              <span className="text-xs font-medium text-muted-foreground text-center">Push</span>
            </div>
            <div className="space-y-1">
              {notifItems.map((item, i) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[1fr_60px_60px] gap-2 items-center rounded-md px-1 py-2.5 hover:bg-secondary/40 transition-colors"
                >
                  <Label className="text-sm cursor-default">{item.label}</Label>
                  <div className="flex justify-center">
                    <Switch checked={item.email} onCheckedChange={() => toggleNotif(i, "email")} />
                  </div>
                  <div className="flex justify-center">
                    <Switch checked={item.push} onCheckedChange={() => toggleNotif(i, "push")} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button onClick={save} className="w-full gap-2" disabled={saving}>
          {saving ? (
            <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faSave} className="h-3.5 w-3.5" />
          )}
          Enregistrer les préférences
        </Button>
      </div>
    </AppLayout>
  );
}
