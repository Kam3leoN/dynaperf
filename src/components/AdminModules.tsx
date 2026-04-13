import { useState, useEffect, useCallback } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faListCheck,
  faMoneyBill,
  faFolder,
  faHandshake,
  faQrcode,
  faEnvelope,
  faComments,
  faVideo,
  faImages,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { ModuleAccessPanel } from "@/components/ModuleAccessPanel";
import { cn } from "@/lib/utils";

interface AppModule {
  id: string;
  module_key: string;
  label: string;
  is_enabled: boolean;
  sort_order: number;
}

const MODULE_ICONS: Record<string, IconDefinition> = {
  audits: faClipboardList,
  suivi: faListCheck,
  primes: faMoneyBill,
  drive: faFolder,
  reseau: faHandshake,
  qrcode: faQrcode,
  visio: faVideo,
  galerie: faImages,
  messages_prives: faEnvelope,
  discussions: faComments,
};

export default function AdminModules() {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdmin(user);
  const [modules, setModules] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItems, setOpenItems] = useState<string[]>([]);

  const loadModules = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("app_modules")
      .select("*")
      .order("sort_order");
    if (error) {
      toast.error(error.message);
      return;
    }
    const current = data ?? [];
    const moduleBlueprints = [
      { module_key: "visio", label: "Visio", sort_order: 95 },
      { module_key: "galerie", label: "Galerie", sort_order: 96 },
    ];
    const missing = moduleBlueprints.filter(
      (blueprint) => !current.some((mod: AppModule) => mod.module_key === blueprint.module_key)
    );

    if (missing.length > 0) {
      const { error: insertError } = await (supabase as any).from("app_modules").insert(
        missing.map((blueprint) => ({
          ...blueprint,
          is_enabled: true,
        }))
      );

      if (insertError) {
        toast.error(insertError.message);
      } else {
        const { data: reloaded, error: reloadError } = await (supabase as any)
          .from("app_modules")
          .select("*")
          .order("sort_order");
        if (reloadError) {
          toast.error(reloadError.message);
          setModules(current);
        } else {
          setModules(reloaded ?? current);
        }
        setLoading(false);
        return;
      }
    }

    setModules(current);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const toggleModule = async (mod: AppModule, newVal: boolean) => {
    setModules((prev) =>
      prev.map((m) => (m.id === mod.id ? { ...m, is_enabled: newVal } : m)),
    );
    const { error } = await (supabase as any)
      .from("app_modules")
      .update({ is_enabled: newVal })
      .eq("id", mod.id);
    if (error) {
      toast.error(error.message);
      setModules((prev) =>
        prev.map((m) => (m.id === mod.id ? { ...m, is_enabled: mod.is_enabled } : m)),
      );
    } else {
      toast.success(`${mod.label} ${newVal ? "activé" : "désactivé"}`);
    }
  };

  const handleSwitchChange = (mod: AppModule, next: boolean) => {
    if (next && !mod.is_enabled && !isSuperAdmin) {
      toast.error("Seul un super administrateur peut réactiver un module désactivé.");
      return;
    }
    void toggleModule(mod, next);
  };

  const canShowAccessPanel = (mod: AppModule) => isSuperAdmin || mod.is_enabled;

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>;
  }

  return (
    <div className="app-page-shell-wide min-w-0 w-full max-w-full space-y-4 pb-8">
      <div className="bg-card rounded-2xl shadow-soft border border-border/60 p-4 sm:p-5 space-y-1">
        <h3 className="text-sm font-semibold text-foreground mb-4">Gestion des modules</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Activez ou désactivez les modules de l&apos;application. Un module désactivé est masqué pour tous
          les utilisateurs. La réactivation d&apos;un module coupé est réservée aux super administrateurs.
          Développez une ligne pour voir les règles d&apos;accès et les surcharges par utilisateur.
        </p>

        <AccordionPrimitive.Root
          type="multiple"
          className="divide-y divide-border/60 border-t border-border/60"
          value={openItems}
          onValueChange={setOpenItems}
        >
          {modules.map((mod) => {
            const icon = MODULE_ICONS[mod.module_key];
            const switchDisabled = !mod.is_enabled && !isSuperAdmin;
            const isOpen = openItems.includes(mod.id);

            return (
              <AccordionPrimitive.Item key={mod.id} value={mod.id} className="border-0">
                <div className="flex flex-wrap items-center gap-2 py-3 sm:flex-nowrap">
                  <AccordionPrimitive.Header className="flex min-w-0 flex-1">
                    <AccordionPrimitive.Trigger
                      className={cn(
                        "group flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 pr-2 text-left text-sm font-medium transition-colors",
                        "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    >
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {icon && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{mod.label}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{mod.module_key}</p>
                        </div>
                      </div>
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>
                  <div
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <Switch
                      checked={mod.is_enabled}
                      disabled={switchDisabled}
                      title={
                        switchDisabled
                          ? "Seul un super administrateur peut réactiver un module désactivé"
                          : undefined
                      }
                      onCheckedChange={(v) => handleSwitchChange(mod, v)}
                    />
                  </div>
                </div>

                {canShowAccessPanel(mod) ? (
                  <AccordionPrimitive.Content className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="border-l-2 border-muted/80 pb-4 pl-4 pt-1 ml-1.5 sm:ml-3">
                      <ModuleAccessPanel
                        module={{
                          id: mod.id,
                          module_key: mod.module_key,
                          label: mod.label,
                          is_enabled: mod.is_enabled,
                        }}
                        active={isOpen}
                        isSuperAdmin={isSuperAdmin}
                      />
                    </div>
                  </AccordionPrimitive.Content>
                ) : (
                  <AccordionPrimitive.Content className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <p className="pb-4 pl-8 text-xs text-muted-foreground">
                      Réactivez le module (super administrateur) pour gérer les accès utilisateurs.
                    </p>
                  </AccordionPrimitive.Content>
                )}
              </AccordionPrimitive.Item>
            );
          })}
        </AccordionPrimitive.Root>
      </div>
    </div>
  );
}
