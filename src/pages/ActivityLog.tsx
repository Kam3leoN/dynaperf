import { useState, useEffect, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft, faPlus, faPenToSquare, faTrash, faClipboardList, faHandshake, faBriefcase, faListCheck } from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ActivityEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  details: any;
  created_at: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  create: { label: "Création", icon: faPlus, color: "text-green-600" },
  update: { label: "Modification", icon: faPenToSquare, color: "text-blue-600" },
  delete: { label: "Suppression", icon: faTrash, color: "text-destructive" },
};

const ENTITY_CONFIG: Record<string, { label: string; icon: any }> = {
  audit: { label: "Audit", icon: faClipboardList },
  partenaire: { label: "Partenaire", icon: faHandshake },
  club: { label: "Club", icon: faBriefcase },
  suivi: { label: "Suivi d'activité", icon: faListCheck },
};

export default function ActivityLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [logRes, profilesRes] = await Promise.all([
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("user_id, display_name"),
    ]);
    if (logRes.data) setEntries(logRes.data as any);
    if (profilesRes.data) setProfiles(profilesRes.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach(p => { m[p.user_id] = p.display_name || "Utilisateur"; });
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    let result = entries;
    if (filterType !== "all") result = result.filter(e => e.entity_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.entity_label || "").toLowerCase().includes(q) ||
        (profileMap[e.user_id || ""] || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, filterType, search, profileMap]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    filtered.forEach(e => {
      const day = format(new Date(e.created_at), "yyyy-MM-dd");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <AppLayout>
      <div className="space-y-4 max-w-3xl mx-auto">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FontAwesomeIcon icon={faClockRotateLeft} className="h-5 w-5 text-primary" />
          Historique d'activité
        </h1>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 text-sm w-full sm:w-[220px]"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-9 text-sm w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(ENTITY_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune activité enregistrée</p>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, items]) => (
              <div key={day}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                  {format(new Date(day), "EEEE d MMMM yyyy", { locale: fr })}
                </h3>
                <div className="relative pl-6 border-l-2 border-border space-y-0">
                  {items.map(e => {
                    const actionCfg = ACTION_CONFIG[e.action] || { label: e.action, icon: faPlus, color: "text-foreground" };
                    const entityCfg = ENTITY_CONFIG[e.entity_type] || { label: e.entity_type, icon: faClipboardList };
                    return (
                      <div key={e.id} className="relative pb-4">
                        <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </div>
                        <Card className="shadow-none border">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                                    <FontAwesomeIcon icon={entityCfg.icon} className="h-2.5 w-2.5" />
                                    {entityCfg.label}
                                  </Badge>
                                  <span className={`text-xs font-medium ${actionCfg.color}`}>
                                    <FontAwesomeIcon icon={actionCfg.icon} className="h-2.5 w-2.5 mr-1" />
                                    {actionCfg.label}
                                  </span>
                                </div>
                                <p className="text-sm font-medium mt-1 truncate">{e.entity_label || "—"}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  par {profileMap[e.user_id || ""] || "Système"} à {format(new Date(e.created_at), "HH:mm", { locale: fr })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
