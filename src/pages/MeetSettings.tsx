import { useEffect, useState } from "react";

const STORAGE_KEY = "dynaperf.meet.settings";

interface MeetSettingsState {
  defaultRoom: string;
  defaultDisplayName: string;
  logoUrl: string;
  domain: string;
}

const DEFAULT_STATE: MeetSettingsState = {
  defaultRoom: "dynameet-room",
  defaultDisplayName: "Invité Dynaperf",
  logoUrl: "",
  domain: "meet.jit.si",
};

export default function MeetSettings() {
  const [state, setState] = useState<MeetSettingsState>(DEFAULT_STATE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<MeetSettingsState>;
      setState({
        defaultRoom: parsed.defaultRoom || DEFAULT_STATE.defaultRoom,
        defaultDisplayName: parsed.defaultDisplayName || DEFAULT_STATE.defaultDisplayName,
        logoUrl: parsed.logoUrl || DEFAULT_STATE.logoUrl,
        domain: parsed.domain || DEFAULT_STATE.domain,
      });
    } catch {
      // noop
    }
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const onLogoUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      setState((prev) => ({ ...prev, logoUrl: value }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="container mx-auto px-4 py-6 md:py-8">
      <section className="w-full rounded-2xl border border-border p-4 md:p-6 bg-card text-card-foreground space-y-4">
        <header>
          <h1 className="text-xl font-semibold">Paramétrer une visio</h1>
          <p className="text-sm text-muted-foreground">Définis les valeurs par défaut de Dyna&apos;Meet.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Salon par défaut</span>
            <input
              value={state.defaultRoom}
              onChange={(e) => setState((prev) => ({ ...prev, defaultRoom: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Nom affiché par défaut</span>
            <input
              value={state.defaultDisplayName}
              onChange={(e) => setState((prev) => ({ ...prev, defaultDisplayName: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Domaine visio</span>
            <input
              value={state.domain}
              onChange={(e) => setState((prev) => ({ ...prev, domain: e.target.value }))}
              placeholder="ex: meet.ton-domaine.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Logo personnalisé (URL)</span>
            <input
              value={state.logoUrl}
              onChange={(e) => setState((prev) => ({ ...prev, logoUrl: e.target.value }))}
              placeholder="https://... ou upload ci-dessous"
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Uploader un logo</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onLogoUpload(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
            />
          </label>
        </div>
        {state.logoUrl ? (
          <div className="rounded-lg border border-border p-3 bg-muted/20">
            <p className="text-sm text-muted-foreground mb-2">Aperçu du logo</p>
            <img src={state.logoUrl} alt="Aperçu logo" className="h-12 w-auto object-contain" />
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
            Enregistrer
          </button>
          {saved && <span className="text-sm text-emerald-600">Paramètres enregistrés.</span>}
        </div>
      </section>
    </main>
  );
}
