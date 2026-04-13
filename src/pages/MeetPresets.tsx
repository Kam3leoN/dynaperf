import { useEffect, useState } from "react";

const STORAGE_KEY = "dynaperf.meet.presets";

interface MeetPreset {
  id: string;
  title: string;
  roomName: string;
}

export default function MeetPresets() {
  const [presets, setPresets] = useState<MeetPreset[]>([]);
  const [title, setTitle] = useState("");
  const [roomName, setRoomName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MeetPreset[];
      setPresets(Array.isArray(parsed) ? parsed : []);
    } catch {
      // noop
    }
  }, []);

  const persist = (next: MeetPreset[]) => {
    setPresets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addPreset = () => {
    if (!title.trim() || !roomName.trim()) return;
    const next: MeetPreset[] = [
      ...presets,
      { id: crypto.randomUUID(), title: title.trim(), roomName: roomName.trim() },
    ];
    persist(next);
    setTitle("");
    setRoomName("");
  };

  const removePreset = (id: string) => {
    persist(presets.filter((preset) => preset.id !== id));
  };

  return (
    <main className="container mx-auto px-4 py-6 md:py-8">
      <section className="w-full rounded-2xl border border-border p-4 md:p-6 bg-card text-card-foreground space-y-4">
        <header>
          <h1 className="text-xl font-semibold">Gérer les visios pré-réglées</h1>
          <p className="text-sm text-muted-foreground">Crée des salons réutilisables pour Dyna&apos;Meet.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nom du pré-réglage"
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
          />
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Nom du salon"
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
          />
          <button type="button" onClick={addPreset} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
            Ajouter
          </button>
        </div>

        <ul className="space-y-2">
          {presets.map((preset) => (
            <li key={preset.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="font-medium">{preset.title}</p>
                <p className="text-sm text-muted-foreground">{preset.roomName}</p>
              </div>
              <button
                type="button"
                onClick={() => removePreset(preset.id)}
                className="px-3 py-1.5 rounded-lg border border-border"
              >
                Supprimer
              </button>
            </li>
          ))}
          {presets.length === 0 && (
            <li className="rounded-lg border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
              Aucun pré-réglage pour le moment.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
