import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faEnvelope, faClipboardList, faListCheck, faHandshake, faSave } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";

interface NotifPreferences {
  emailAuditCreated: boolean;
  emailAuditCompleted: boolean;
  emailSuiviCreated: boolean;
  emailWeeklyDigest: boolean;
  pushNewAudit: boolean;
  pushReminders: boolean;
  pushPartenaireUpdates: boolean;
}

const defaultPrefs: NotifPreferences = {
  emailAuditCreated: true,
  emailAuditCompleted: true,
  emailSuiviCreated: false,
  emailWeeklyDigest: true,
  pushNewAudit: true,
  pushReminders: true,
  pushPartenaireUpdates: false,
};

const STORAGE_KEY = "dynaperf_notif_prefs";

export default function Notifications() {
  const [prefs, setPrefs] = useState<NotifPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  const toggle = (key: keyof NotifPreferences) =>
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    toast.success("Préférences de notifications enregistrées");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <FontAwesomeIcon icon={faBell} className="h-5 w-5 text-primary" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos préférences de notifications par email et push.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 text-primary" />
              Notifications par email
            </CardTitle>
            <CardDescription>Choisissez les emails que vous souhaitez recevoir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailAuditCreated" className="flex items-center gap-2 text-sm cursor-pointer">
                <FontAwesomeIcon icon={faClipboardList} className="h-3.5 w-3.5 text-muted-foreground" />
                Nouvel audit créé
              </Label>
              <Switch id="emailAuditCreated" checked={prefs.emailAuditCreated} onCheckedChange={() => toggle("emailAuditCreated")} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="emailAuditCompleted" className="flex items-center gap-2 text-sm cursor-pointer">
                <FontAwesomeIcon icon={faClipboardList} className="h-3.5 w-3.5 text-muted-foreground" />
                Audit complété
              </Label>
              <Switch id="emailAuditCompleted" checked={prefs.emailAuditCompleted} onCheckedChange={() => toggle("emailAuditCompleted")} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="emailSuiviCreated" className="flex items-center gap-2 text-sm cursor-pointer">
                <FontAwesomeIcon icon={faListCheck} className="h-3.5 w-3.5 text-muted-foreground" />
                Nouveau suivi d'activité
              </Label>
              <Switch id="emailSuiviCreated" checked={prefs.emailSuiviCreated} onCheckedChange={() => toggle("emailSuiviCreated")} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="emailWeeklyDigest" className="flex items-center gap-2 text-sm cursor-pointer">
                <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 text-muted-foreground" />
                Résumé hebdomadaire
              </Label>
              <Switch id="emailWeeklyDigest" checked={prefs.emailWeeklyDigest} onCheckedChange={() => toggle("emailWeeklyDigest")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FontAwesomeIcon icon={faBell} className="h-4 w-4 text-primary" />
              Notifications push
            </CardTitle>
            <CardDescription>Notifications sur votre appareil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pushNewAudit" className="flex items-center gap-2 text-sm cursor-pointer">
                <FontAwesomeIcon icon={faClipboardList} className="h-3.5 w-3.5 text-muted-foreground" />
                Nouveau audit assigné
              </Label>
              <Switch id="pushNewAudit" checked={prefs.pushNewAudit} onCheckedChange={() => toggle("pushNewAudit")} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pushReminders" className="flex items-center gap-2 text-sm cursor-pointer">
                <FontAwesomeIcon icon={faBell} className="h-3.5 w-3.5 text-muted-foreground" />
                Rappels
              </Label>
              <Switch id="pushReminders" checked={prefs.pushReminders} onCheckedChange={() => toggle("pushReminders")} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pushPartenaireUpdates" className="flex items-center gap-2 text-sm cursor-pointer">
                <FontAwesomeIcon icon={faHandshake} className="h-3.5 w-3.5 text-muted-foreground" />
                Mises à jour partenaires
              </Label>
              <Switch id="pushPartenaireUpdates" checked={prefs.pushPartenaireUpdates} onCheckedChange={() => toggle("pushPartenaireUpdates")} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={save} className="w-full gap-2">
          <FontAwesomeIcon icon={faSave} className="h-3.5 w-3.5" />
          Enregistrer les préférences
        </Button>
      </div>
    </AppLayout>
  );
}
