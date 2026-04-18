import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ActivityEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  details: unknown;
  created_at: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
};

const ENTITY_LABEL: Record<string, string> = {
  audit: "Audit",
  partenaire: "Partenaire",
  club: "Club",
  suivi: "Suivi d'activité",
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
    if (logRes.data) setEntries(logRes.data as ActivityEntry[]);
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach((p) => {
      m[p.user_id] = p.display_name || "Utilisateur";
    });
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    let result = entries;
    if (filterType !== "all") result = result.filter((e) => e.entity_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          (e.entity_label || "").toLowerCase().includes(q) ||
          (profileMap[e.user_id || ""] || "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [entries, filterType, search, profileMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    filtered.forEach((e) => {
      const day = format(new Date(e.created_at), "yyyy-MM-dd");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(e);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          <FontAwesomeIcon icon={faClockRotateLeft} className="mr-2.5 h-6 w-6 text-primary" aria-hidden />
          Historique d&apos;activité
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Journal des actions récentes sur la plateforme</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Rechercher par libellé ou auteur…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 max-w-md"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-10 w-full sm:w-[200px]">
            <SelectValue placeholder="Type d'entité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Chargement…</p>
      ) : grouped.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Aucune activité enregistrée</p>
      ) : (
        <div className="space-y-10">
          {grouped.map(([day, items]) => (
            <section key={day}>
              {/* Séparateur date — conservé tel quel */}
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                <p className="shrink-0 text-sm font-semibold capitalize tracking-wide text-muted-foreground">
                  {format(new Date(day), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>

              <ul className="mt-5 divide-y divide-border/60 rounded-lg border border-border/50 bg-card/40">
                {items.map((e) => {
                  const actionLabel = ACTION_LABEL[e.action] ?? e.action;
                  const entityLabel = ENTITY_LABEL[e.entity_type] ?? e.entity_type;
                  const author = profileMap[e.user_id || ""] || "Système";
                  const timeStr = format(new Date(e.created_at), "HH:mm", { locale: fr });

                  return (
                    <li key={e.id}>
                      <div className="flex gap-3 px-3 py-2.5 transition-colors hover:bg-muted/30 sm:gap-4 sm:px-4 sm:py-3">
                        <time
                          className="w-10 shrink-0 pt-0.5 text-right text-[11px] font-medium tabular-nums text-muted-foreground sm:w-11 sm:text-xs"
                          dateTime={e.created_at}
                        >
                          {timeStr}
                        </time>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug text-foreground">
                            {e.entity_label || "—"}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            {entityLabel}
                            <span className="mx-1.5 text-border">·</span>
                            {actionLabel}
                            <span className="mx-1.5 text-border">·</span>
                            {author}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
