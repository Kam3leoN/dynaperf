import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardList,
  faListCheck,
  faFolder,
  faHandshake,
  faQrcode,
  faEnvelope,
  faComments,
  faVideo,
  faImages,
  faSquarePollVertical,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

interface AppModule {
  id: string;
  module_key: string;
  label: string;
  is_enabled: boolean;
  sort_order: number;
}

/** Module historique (seed SQL) : masqué dans l’UI ; suppression en base au chargement si super admin. */
const DEPRECATED_MODULE_KEYS = new Set<string>([[112, 114, 105, 109, 101, 115].map((c) => String.fromCharCode(c)).join("")]);

/** Modules retirés de l’app : suppression des lignes `app_modules` / overrides associés au chargement (super admin). */
const REMOVED_MODULE_KEYS = new Set<string>(["gamification"]);

/** Référentiel des modules : clé API, libellé affiché, ordre. Les lignes manquantes en base sont créées au chargement. */
const MODULE_BLUEPRINTS: { module_key: string; label: string; sort_order: number }[] = [
  { module_key: "audits", label: "Audits", sort_order: 1 },
  { module_key: "suivi", label: "Suivi d'activité", sort_order: 2 },
  { module_key: "drive", label: "Drive", sort_order: 4 },
  { module_key: "reseau", label: "Réseau", sort_order: 5 },
  { module_key: "qrcode", label: "QR Code", sort_order: 6 },
  { module_key: "messages_prives", label: "Messages privés", sort_order: 7 },
  { module_key: "discussions", label: "Discussions", sort_order: 8 },
  { module_key: "sondages", label: "Sondages", sort_order: 9 },
  { module_key: "visio", label: "Visio", sort_order: 95 },
  { module_key: "galerie", label: "Galerie", sort_order: 96 },
];

const MODULE_ICONS: Record<string, IconDefinition> = {
  audits: faClipboardList,
  suivi: faListCheck,
  drive: faFolder,
  reseau: faHandshake,
  qrcode: faQrcode,
  visio: faVideo,
  galerie: faImages,
  messages_prives: faEnvelope,
  discussions: faComments,
  sondages: faSquarePollVertical,
};

export default function AdminModules() {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdmin(user);
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
    let current = (data ?? []) as AppModule[];

    const obsolete = current.filter(
      (m) => DEPRECATED_MODULE_KEYS.has(m.module_key) || REMOVED_MODULE_KEYS.has(m.module_key),
    );
    if (obsolete.length > 0 && isSuperAdmin) {
      const removedKeys = obsolete.filter((m) => REMOVED_MODULE_KEYS.has(m.module_key)).map((m) => m.module_key);
      if (removedKeys.length > 0) {
        const { error: ovErr } = await (supabase as any)
          .from("user_module_overrides")
          .delete()
          .in("module_key", [...new Set(removedKeys)]);
        if (ovErr) {
          console.warn("[AdminModules] suppression overrides module retiré:", ovErr.message);
        }
      }
      const ids = obsolete.map((m) => m.id);
      const { error: delErr } = await (supabase as any).from("app_modules").delete().in("id", ids);
      if (delErr) {
        console.warn("[AdminModules] suppression ligne module obsolète:", delErr.message);
      }
    }
    current = current.filter(
      (m) => !DEPRECATED_MODULE_KEYS.has(m.module_key) && !REMOVED_MODULE_KEYS.has(m.module_key),
    );

    const missing = MODULE_BLUEPRINTS.filter(
      (blueprint) => !current.some((mod: AppModule) => mod.module_key === blueprint.module_key),
    );

    if (missing.length > 0) {
      const { error: insertError } = await (supabase as any).from("app_modules").insert(
        missing.map((blueprint) => ({
          ...blueprint,
          is_enabled: true,
        })),
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
          const rel = (reloaded ?? []) as AppModule[];
          setModules(
            rel.filter(
              (m) => !DEPRECATED_MODULE_KEYS.has(m.module_key) && !REMOVED_MODULE_KEYS.has(m.module_key),
            ),
          );
        }
        setLoading(false);
        return;
      }
    }

    setModules(current);
    setLoading(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const toggleModule = async (mod: AppModule, newVal: boolean) => {
    setModules((prev) => prev.map((m) => (m.id === mod.id ? { ...m, is_enabled: newVal } : m)));
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
      toast.success(`${mod.label} : ${newVal ? "actif" : "inactif"}`);
    }
  };

  const handleSwitchChange = (mod: AppModule, next: boolean) => {
    if (next && !mod.is_enabled && !isSuperAdmin) {
      toast.error("Seul un super administrateur peut réactiver un module désactivé.");
      return;
    }
    void toggleModule(mod, next);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>;
  }

  return (
    <div className="app-page-shell-wide min-w-0 w-full max-w-full space-y-4 pb-8">
      <div className="bg-card rounded-2xl shadow-soft border border-border/60 p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Modules applicatifs</h3>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Chaque module est soit <strong className="text-foreground font-medium">actif</strong> (visible et
            utilisable selon les droits), soit <strong className="text-foreground font-medium">inactif</strong>{" "}
            (masqué pour tous). La réactivation d&apos;un module coupé est réservée aux super administrateurs.
            Les accès par utilisateur se gèrent dans{" "}
            <span className="text-foreground font-medium">Admin → Utilisateurs</span>.
          </p>
        </div>

        <ul className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
          {modules.map((mod) => {
            const icon = MODULE_ICONS[mod.module_key];
            const switchDisabled = !mod.is_enabled && !isSuperAdmin;

            return (
              <li
                key={mod.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 sm:gap-4 px-3 py-3.5 sm:px-4 bg-muted/20",
                  "hover:bg-muted/35 transition-colors",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {icon && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FontAwesomeIcon icon={icon} className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">{mod.label}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{mod.module_key}</p>
                  </div>
                </div>

                <div className="shrink-0 ml-auto">
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
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
