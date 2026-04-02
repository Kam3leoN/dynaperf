import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye } from "@fortawesome/free-solid-svg-icons";

interface MyConfig {
  objectif: number;
  palier_1: number | null;
  palier_2: number | null;
  palier_3: number | null;
}

export function MyObjectives() {
  const { user } = useAuth();
  const [config, setConfig] = useState<MyConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("collaborateur_config")
        .select("objectif, palier_1, palier_2, palier_3")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) setConfig(data);
      setLoading(false);
    };

    load();
  }, [user]);

  if (loading || !config) return null;

  const paliers = [
    { label: "Palier 1", value: config.palier_1 },
    { label: "Palier 2", value: config.palier_2 },
    { label: "Palier 3", value: config.palier_3 },
  ].filter((p) => p.value !== null);

  if (!config.objectif && paliers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-2xl border border-border/60 p-4 sm:p-5 shadow-soft"
    >
      <div className="flex items-center gap-2 mb-3">
        <FontAwesomeIcon icon={faBullseye} className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Mes objectifs
        </h3>
      </div>

      {config.objectif > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground">Objectif global</p>
          <span className="text-xl font-bold text-foreground tabular-nums">{config.objectif}</span>
        </div>
      )}

      {paliers.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {paliers.map((p) => (
            <div key={p.label} className="bg-secondary/50 rounded-md px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground">{p.label}</p>
              <span className="text-lg font-bold text-foreground tabular-nums">{p.value}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
