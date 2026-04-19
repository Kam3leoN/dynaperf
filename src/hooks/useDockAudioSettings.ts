import { useCallback, useEffect, useMemo, useState } from "react";

/** Valeur radio unique pour « défaut système / navigateur » — ne jamais utiliser la chaîne `"default"` (collision avec `deviceId` réel des navigateurs). */
export const DOCK_AUDIO_DEFAULT_RADIO_VALUE = "__dynaperf_dock_audio_default__" as const;

const INPUT_DEV_KEY = "dynaperf_dock_audio_input_device";
const OUTPUT_DEV_KEY = "dynaperf_dock_audio_output_device";
const INPUT_VOL_KEY = "dynaperf_dock_audio_input_vol";
const OUTPUT_VOL_KEY = "dynaperf_dock_audio_output_vol";
const INPUT_PROFILE_KEY = "dynaperf_dock_audio_input_profile";

export type DockInputAudioProfile = "voiceIsolation" | "studio" | "custom";

function readString(key: string, fallback: string): string {
  try {
    const v = localStorage.getItem(key);
    return v === null || v === "" ? fallback : v;
  } catch {
    return fallback;
  }
}

function readInt(key: string, fallback: number, min: number, max: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = Number.parseInt(v, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Ancienne valeur + collision navigateur `deviceId === "default"`. */
function normalizeStoredDeviceId(v: string): string {
  if (!v || v === "default") return DOCK_AUDIO_DEFAULT_RADIO_VALUE;
  return v;
}

/**
 * Périphériques et réglages audio du dock (MediaDevices, volumes, profil d’entrée).
 * Les volumes de sortie s’appliquent aux balises `audio` / `video` de la page ; `setSinkId` si supporté.
 */
export function useDockAudioSettings() {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);

  const [selectedInputId, setSelectedInputIdState] = useState(() =>
    normalizeStoredDeviceId(readString(INPUT_DEV_KEY, DOCK_AUDIO_DEFAULT_RADIO_VALUE)),
  );
  const [selectedOutputId, setSelectedOutputIdState] = useState(() =>
    normalizeStoredDeviceId(readString(OUTPUT_DEV_KEY, DOCK_AUDIO_DEFAULT_RADIO_VALUE)),
  );
  const [inputVolume, setInputVolumeState] = useState(() =>
    readInt(INPUT_VOL_KEY, 100, 0, 100),
  );
  const [outputVolume, setOutputVolumeState] = useState(() =>
    readInt(OUTPUT_VOL_KEY, 100, 0, 100),
  );
  const [inputProfile, setInputProfileState] = useState<DockInputAudioProfile>(() => {
    const v = readString(INPUT_PROFILE_KEY, "custom");
    if (v === "voiceIsolation" || v === "studio" || v === "custom") return v;
    return "custom";
  });

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setInputDevices(list.filter((d) => d.kind === "audioinput"));
      setOutputDevices(list.filter((d) => d.kind === "audiooutput"));
    } catch {
      /* ignore */
    }
  }, []);

  /** Demande un accès micro court si les entrées n’ont pas de libellé (navigateurs). Puis ré-énumère. */
  const ensureAudioDeviceLabelsIfNeeded = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const inputs = list.filter((d) => d.kind === "audioinput");
      const needsPermission = inputs.length > 0 && inputs.every((d) => !d.label?.trim());
      if (needsPermission) {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      }
    } catch {
      /* permission refusée ou indisponible */
    }
    await refreshDevices();
  }, [refreshDevices]);

  useEffect(() => {
    void refreshDevices();
    const md = navigator.mediaDevices;
    if (!md) return;
    const onChange = () => void refreshDevices();
    md.addEventListener("devicechange", onChange);
    return () => md.removeEventListener("devicechange", onChange);
  }, [refreshDevices]);

  const setSelectedInputId = useCallback((id: string) => {
    const next = normalizeStoredDeviceId(id);
    setSelectedInputIdState(next);
    write(INPUT_DEV_KEY, next);
  }, []);

  const setSelectedOutputId = useCallback((id: string) => {
    const next = normalizeStoredDeviceId(id);
    setSelectedOutputIdState(next);
    write(OUTPUT_DEV_KEY, next);
  }, []);

  const setInputVolume = useCallback((v: number) => {
    const n = Math.min(100, Math.max(0, Math.round(v)));
    setInputVolumeState(n);
    write(INPUT_VOL_KEY, String(n));
  }, []);

  const setOutputVolume = useCallback((v: number) => {
    const n = Math.min(100, Math.max(0, Math.round(v)));
    setOutputVolumeState(n);
    write(OUTPUT_VOL_KEY, String(n));
  }, []);

  const setInputProfile = useCallback((p: DockInputAudioProfile) => {
    setInputProfileState(p);
    write(INPUT_PROFILE_KEY, p);
  }, []);

  /** Identifiant passé à getUserMedia : `null` = défaut navigateur. */
  const inputDeviceConstraintId = useMemo(() => {
    if (
      !selectedInputId ||
      selectedInputId === "default" ||
      selectedInputId === DOCK_AUDIO_DEFAULT_RADIO_VALUE
    ) {
      return null;
    }
    return selectedInputId;
  }, [selectedInputId]);

  /** Applique le volume de sortie et la sortie audio (`setSinkId`) aux médias de la page. */
  useEffect(() => {
    const vol = outputVolume / 100;
    const applyVolume = () => {
      document.querySelectorAll("audio,video").forEach((el) => {
        try {
          (el as HTMLMediaElement).volume = vol;
        } catch {
          /* ignore */
        }
      });
    };
    applyVolume();
    const obs = new MutationObserver(applyVolume);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [outputVolume]);

  useEffect(() => {
    const sinkId =
      !selectedOutputId ||
      selectedOutputId === "default" ||
      selectedOutputId === DOCK_AUDIO_DEFAULT_RADIO_VALUE
        ? ""
        : selectedOutputId;
    const applySink = () => {
      document.querySelectorAll("audio,video").forEach((el) => {
        const media = el as HTMLMediaElement & {
          setSinkId?: (id: string) => Promise<void>;
        };
        if (typeof media.setSinkId !== "function") return;
        void media.setSinkId(sinkId).catch(() => {
          /* périphérique invalide ou permissions */
        });
      });
    };
    applySink();
    const obs = new MutationObserver(applySink);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [selectedOutputId]);

  const canSetSinkId =
    typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

  const selectedInputLabel = useMemo(() => {
    if (
      !selectedInputId ||
      selectedInputId === "default" ||
      selectedInputId === DOCK_AUDIO_DEFAULT_RADIO_VALUE
    ) {
      return "Paramètres audio du système par défaut";
    }
    const d = inputDevices.find((x) => x.deviceId === selectedInputId);
    return d?.label || selectedInputId;
  }, [inputDevices, selectedInputId]);

  const selectedOutputLabel = useMemo(() => {
    if (
      !selectedOutputId ||
      selectedOutputId === "default" ||
      selectedOutputId === DOCK_AUDIO_DEFAULT_RADIO_VALUE
    ) {
      return "Paramètres audio du système par défaut";
    }
    const d = outputDevices.find((x) => x.deviceId === selectedOutputId);
    return d?.label || selectedOutputId;
  }, [outputDevices, selectedOutputId]);

  const inputProfileLabel = useMemo(() => {
    switch (inputProfile) {
      case "voiceIsolation":
        return "Isolement de la voix";
      case "studio":
        return "Studio";
      case "custom":
      default:
        return "Personnalisés";
    }
  }, [inputProfile]);

  /** Exclut les entrées dont l’id entre en collision avec la ligne « défaut » (`deviceId === "default"`). */
  const inputDevicesForMenu = useMemo(
    () => inputDevices.filter((d) => d.deviceId && d.deviceId !== "default"),
    [inputDevices],
  );

  const outputDevicesForMenu = useMemo(
    () => outputDevices.filter((d) => d.deviceId && d.deviceId !== "default"),
    [outputDevices],
  );

  return {
    inputDevices,
    outputDevices,
    inputDevicesForMenu,
    outputDevicesForMenu,
    refreshDevices,
    ensureAudioDeviceLabelsIfNeeded,
    selectedInputId,
    setSelectedInputId,
    selectedOutputId,
    setSelectedOutputId,
    inputVolume,
    setInputVolume,
    outputVolume,
    setOutputVolume,
    inputProfile,
    setInputProfile,
    inputDeviceConstraintId,
    canSetSinkId,
    selectedInputLabel,
    selectedOutputLabel,
    inputProfileLabel,
  };
}

export type DockAudioSettings = ReturnType<typeof useDockAudioSettings>;
