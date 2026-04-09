import { useState, useEffect, useCallback } from "react";
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
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

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
  messages_prives: faEnvelope,
  discussions: faComments,
};

export default function AdminModules() {
  const [modules, setModules] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadModules = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("app_modules")
      .select("*")
      .order("sort_order");
    if (error) {
      toast.error(error.message);
      return;
    }
    setModules(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const toggleModule = async (mod: AppModule) => {
    const newVal = !mod.is_enabled;
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

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>;
  }

  return (
    <div className="bg-card rounded-2xl shadow-soft border border-border/60 p-4 sm:p-5 space-y-1">
      <h3 className="text-sm font-semibold text-foreground mb-4">Gestion des modules</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Activez ou désactivez les modules de l'application. Un module désactivé sera masqué pour tous les utilisateurs.
      </p>
      <div className="divide-y divide-border/60">
        {modules.map((mod) => {
          const icon = MODULE_ICONS[mod.module_key];
          return (
            <div
              key={mod.id}
              className="flex items-center justify-between py-3 gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{mod.label}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{mod.module_key}</p>
                </div>
              </div>
              <Switch
                checked={mod.is_enabled}
                onCheckedChange={() => toggleModule(mod)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
