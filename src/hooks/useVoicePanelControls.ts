import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

const MIC_KEY = "dynaperf_voice_mic_muted";
const DEAF_KEY = "dynaperf_voice_deafened";

function readBool(key: string, defaultVal = false): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultVal;
    return v === "true";
  } catch {
    return defaultVal;
  }
}

export type VoicePanelControlsOptions = {
  /** `null` ou `undefined` = micro par défaut du navigateur ; sinon `deviceId` exact. */
  inputDeviceId?: string | null;
};

/**
 * Contrôle « Discord-like » : micro (muet / actif) et sourdine sortie (coupe le son des &lt;audio&gt;/&lt;video&gt;).
 * Le micro navigateur est coupé lorsque muet ou sourd.
 */
export function useVoicePanelControls(opts?: VoicePanelControlsOptions) {
  const inputDeviceId = opts?.inputDeviceId ?? null;
  const [micMuted, setMicMuted] = useState(() => readBool(MIC_KEY, false));
  const [deafened, setDeafened] = useState(() => readBool(DEAF_KEY, false));
  const streamRef = useRef<MediaStream | null>(null);
  const lastAppliedInputKeyRef = useRef<string | undefined>(undefined);

  const effectiveMicMuted = deafened || micMuted;

  useEffect(() => {
    let cancelled = false;

    const syncMic = async () => {
      if (effectiveMicMuted) {
        streamRef.current?.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
        return;
      }

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return;
      }

      const targetKey = inputDeviceId ?? "default";

      try {
        const track = streamRef.current?.getAudioTracks()[0];
        const canReuse =
          Boolean(track && track.readyState === "live" && lastAppliedInputKeyRef.current === targetKey);

        if (canReuse && streamRef.current) {
          streamRef.current.getAudioTracks().forEach((t) => {
            t.enabled = true;
          });
          return;
        }

        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const audio: boolean | MediaTrackConstraints =
          inputDeviceId && inputDeviceId.length > 0
            ? { deviceId: { exact: inputDeviceId } }
            : true;

        const s = await navigator.mediaDevices.getUserMedia({ audio });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        lastAppliedInputKeyRef.current = targetKey;
        s.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });
      } catch {
        if (cancelled) return;
        setMicMuted(true);
        try {
          localStorage.setItem(MIC_KEY, "true");
        } catch {
          /* ignore */
        }
        toast.error("Micro inaccessible — vérifiez les permissions du navigateur.");
      }
    };

    void syncMic();
    return () => {
      cancelled = true;
    };
  }, [effectiveMicMuted, inputDeviceId]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      lastAppliedInputKeyRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    const applyOutput = () => {
      document.querySelectorAll("audio,video").forEach((el) => {
        const media = el as HTMLMediaElement;
        media.muted = deafened;
      });
    };

    applyOutput();
    if (!deafened) {
      return;
    }

    const obs = new MutationObserver(() => applyOutput());
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [deafened]);

  const toggleMic = useCallback(() => {
    setMicMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MIC_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const toggleDeafen = useCallback(() => {
    setDeafened((d) => {
      const next = !d;
      try {
        localStorage.setItem(DEAF_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return {
    micMuted,
    deafened,
    effectiveMicMuted,
    toggleMic,
    toggleDeafen,
  };
}
