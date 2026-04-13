import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface JitsiMeetModuleProps {
  roomName?: string;
  displayName?: string;
  domain?: string;
  brandLogoUrl?: string;
}

const DEFAULT_DOMAIN = "meet.jit.si";
const EXTERNAL_API_SCRIPT_URL = "https://meet.jit.si/external_api.js";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => {
      addEventListener: (event: string, callback: (...args: unknown[]) => void) => void;
      executeCommand: (command: string) => void;
      dispose: () => void;
    };
  }
}

/**
 * Module autonome de visioconférence Dyna'Meet basé sur l'API iframe Jitsi.
 */
export function JitsiMeetModule({
  roomName = "dynameet-room",
  displayName = "Invité",
  domain = DEFAULT_DOMAIN,
  brandLogoUrl,
}: JitsiMeetModuleProps) {
  const [room, setRoom] = useState(roomName);
  const [name, setName] = useState(displayName);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const apiRef = useRef<{
    addEventListener: (event: string, callback: (...args: unknown[]) => void) => void;
    executeCommand: (command: string) => void;
    dispose: () => void;
  } | null>(null);
  const iframeContainerRef = useRef<HTMLDivElement | null>(null);

  const roomTitle = useMemo(() => `Salon: ${room || "—"}`, [room]);
  const isDemoDomain = useMemo(() => domain.trim().toLowerCase() === "meet.jit.si", [domain]);

  const ensureExternalApi = useCallback(async () => {
    if (window.JitsiMeetExternalAPI) return;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${EXTERNAL_API_SCRIPT_URL}"]`) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Impossible de charger l'API de visioconférence.")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.src = EXTERNAL_API_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Impossible de charger l'API de visioconférence."));
      document.body.appendChild(script);
    });

    if (!window.JitsiMeetExternalAPI) {
      throw new Error("API de visioconférence indisponible.");
    }
  }, []);

  const disposeAll = useCallback(async () => {
    const api = apiRef.current;
    if (api) {
      try {
        api.dispose();
      } catch {
        // noop
      }
    }
    apiRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    setParticipantsCount(0);
  }, []);

  const connect = useCallback(async () => {
    if (!room.trim()) {
      setError("Le nom de salon est requis.");
      return;
    }

    setError(null);
    setIsConnecting(true);

    try {
      await ensureExternalApi();
      await disposeAll();

      const API = window.JitsiMeetExternalAPI;
      if (!API || !iframeContainerRef.current) {
        throw new Error("Le module de visioconférence n'est pas disponible.");
      }

      const api = new API(domain, {
        roomName: room.trim(),
        parentNode: iframeContainerRef.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: name || "Invité" },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableModeratorIndicator: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: "",
          DEFAULT_LOGO_URL: brandLogoUrl || undefined,
        },
      });

      apiRef.current = api;

      api.addEventListener("videoConferenceJoined", () => {
        setIsConnected(true);
        setIsConnecting(false);
      });
      api.addEventListener("readyToClose", () => {
        void disposeAll();
      });
      api.addEventListener("audioMuteStatusChanged", (payload: unknown) => {
        const muted = Boolean((payload as { muted?: boolean })?.muted);
        setIsAudioMuted(muted);
      });
      api.addEventListener("videoMuteStatusChanged", (payload: unknown) => {
        const muted = Boolean((payload as { muted?: boolean })?.muted);
        setIsVideoMuted(muted);
      });
      api.addEventListener("participantJoined", () => {
        setParticipantsCount((prev) => prev + 1);
      });
      api.addEventListener("participantLeft", () => {
        setParticipantsCount((prev) => Math.max(0, prev - 1));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setIsConnecting(false);
      await disposeAll();
    }
  }, [brandLogoUrl, disposeAll, domain, ensureExternalApi, name, room]);

  const disconnect = useCallback(async () => {
    await disposeAll();
  }, [disposeAll]);

  const toggleAudio = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !isConnected) return;
    api.executeCommand("toggleAudio");
  }, [isConnected]);

  const toggleVideo = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !isConnected) return;
    api.executeCommand("toggleVideo");
  }, [isConnected]);

  useEffect(() => {
    return () => {
      void disposeAll();
    };
  }, [disposeAll]);

  return (
    <section className="w-full rounded-2xl border border-border p-4 md:p-6 bg-card text-card-foreground space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          {brandLogoUrl ? (
            <img
              src={brandLogoUrl}
              alt="Logo Dyna'Meet"
              className="h-10 w-auto object-contain mb-2"
            />
          ) : null}
          <h2 className="text-xl font-semibold">Dyna&apos;Meet</h2>
          <p className="text-sm text-muted-foreground">{roomTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isConnected ? (
            <button
              type="button"
              onClick={connect}
              disabled={isConnecting}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-60"
            >
              {isConnecting ? "Connexion..." : "Rejoindre"}
            </button>
          ) : (
            <button
              type="button"
              onClick={disconnect}
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground"
            >
              Quitter
            </button>
          )}
          <button
            type="button"
            onClick={toggleAudio}
            disabled={!isConnected}
            className="px-4 py-2 rounded-lg border border-border disabled:opacity-50"
          >
            {isAudioMuted ? "Activer micro" : "Couper micro"}
          </button>
          <button
            type="button"
            onClick={toggleVideo}
            disabled={!isConnected}
            className="px-4 py-2 rounded-lg border border-border disabled:opacity-50"
          >
            {isVideoMuted ? "Activer caméra" : "Couper caméra"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Nom du salon</span>
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            disabled={isConnected}
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            placeholder="ex: equipe-commerciale"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Ton nom affiché</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isConnected}
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
            placeholder="ex: Camille"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {isDemoDomain && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
          Domaine démo détecté (`meet.jit.si`) : la session peut être limitée. Configure ton propre domaine dans
          « Paramétrer une visio » pour un usage production sans limitation.
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Participants ({participantsCount})</h3>
        <div className="h-[60vh] min-h-[420px] rounded-xl border border-border overflow-hidden bg-muted/30">
          <div ref={iframeContainerRef} className="h-full w-full" />
        </div>
        {!isConnected && (
          <p className="text-xs text-muted-foreground">
            Rejoins le salon pour démarrer la réunion.
          </p>
        )}
      </div>
    </section>
  );
}

export default JitsiMeetModule;
