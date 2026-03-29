import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faMoon, faSun, faSave } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "next-themes";
import { toast } from "sonner";

interface NotifItem {
  key: string;
  label: string;
  email: boolean;
  push: boolean;
}

const defaultItems: NotifItem[] = [
  { key: "auditCreated", label: "Nouvel audit créé", email: true, push: true },
  { key: "auditCompleted", label: "Audit complété", email: true, push: false },
  { key: "suiviCreated", label: "Nouveau suivi d'activité", email: false, push: true },
  { key: "weeklyDigest", label: "Résumé hebdomadaire", email: true, push: false },
  { key: "partenaireUpdates", label: "Mises à jour partenaires", email: false, push: false },
  { key: "clubUpdates", label: "Mises à jour clubs d'affaires", email: false, push: false },
  { key: "reminders", label: "Rappels", email: true, push: true },
];

const STORAGE_KEY = "dynaperf_notif_prefs";

export default function Preferences() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [items, setItems] = useState<NotifItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultItems;
    } catch {
      return defaultItems;
    }
  });

  const toggle = (index: number, channel: "email" | "push") => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [channel]: !item[channel] } : item
      )
    );
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
              {items.map((item, i) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[1fr_60px_60px] gap-2 items-center rounded-md px-1 py-2.5 hover:bg-secondary/40 transition-colors"
                >
                  <Label className="text-sm cursor-default">{item.label}</Label>
                  <div className="flex justify-center">
                    <Switch checked={item.email} onCheckedChange={() => toggle(i, "email")} />
                  </div>
                  <div className="flex justify-center">
                    <Switch checked={item.push} onCheckedChange={() => toggle(i, "push")} />
                  </div>
                </div>
              ))}
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
