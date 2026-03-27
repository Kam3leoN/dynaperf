import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "next-themes";

export default function Preferences() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Apparence</CardTitle>
            <CardDescription>Choisissez le thème de l'interface.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-md px-1 py-3">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={isDark ? faMoon : faSun} className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm cursor-default">
                  Mode sombre
                </Label>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
