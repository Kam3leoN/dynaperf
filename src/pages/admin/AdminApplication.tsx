import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminSecteurs from "@/components/AdminSecteurs";
import AdminAuditGridInline from "@/components/AdminAuditGrid";
import AdminModules from "@/components/AdminModules";

const TAB_KEYS = ["modules", "audits", "secteurs"] as const;

/**
 * Paramètres d’application : modules, grille audits, secteurs (onglets).
 * Onglet initial via `?tab=audits` (etc.).
 */
export default function AdminApplication() {
  const [searchParams] = useSearchParams();
  const defaultTab = useMemo(() => {
    const t = searchParams.get("tab");
    return TAB_KEYS.includes(t as (typeof TAB_KEYS)[number]) ? t! : "modules";
  }, [searchParams]);

  return (
    <div className="app-page-shell min-w-0 w-full max-w-full space-y-4 pb-8 sm:space-y-6">
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="secteurs">Secteurs</TabsTrigger>
        </TabsList>
        <TabsContent value="modules">
          <AdminModules />
        </TabsContent>
        <TabsContent value="audits">
          <AdminAuditGridInline />
        </TabsContent>
        <TabsContent value="secteurs">
          <AdminSecteurs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
