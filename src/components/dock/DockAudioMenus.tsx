import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { DOCK_AUDIO_DEFAULT_RADIO_VALUE, type DockAudioSettings } from "@/hooks/useDockAudioSettings";
import { cn } from "@/lib/utils";

function deviceLineLabel(d: MediaDeviceInfo) {
  if (d.label?.trim()) return d.label.trim();
  const short = d.deviceId.length > 14 ? `${d.deviceId.slice(0, 14)}…` : d.deviceId;
  return `Périphérique (${short})`;
}

export function DockMicSettingsMenuContent({
  audio,
  className,
}: {
  audio: DockAudioSettings;
  className?: string;
}) {
  return (
    <DropdownMenuContent
      side="top"
      align="end"
      sideOffset={8}
      className={cn(
        "z-[120] min-w-[280px] max-w-[min(96vw,360px)] overflow-visible p-0",
        className,
      )}
    >
      <div className="p-1">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(
              "flex min-h-0 w-full cursor-default flex-row items-center gap-2 rounded-sm px-2 py-2 text-left",
              "data-[state=open]:bg-accent",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold leading-tight">Périphérique d&apos;entrée</span>
              <span className="line-clamp-2 text-left text-xs font-normal text-muted-foreground">
                {audio.selectedInputLabel}
              </span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            sideOffset={6}
            className="z-[130] min-w-[260px] max-w-[min(96vw,380px)] p-1"
          >
            <DropdownMenuRadioGroup
              value={audio.selectedInputId}
              onValueChange={(v) => v && audio.setSelectedInputId(v)}
            >
              <DropdownMenuRadioItem value={DOCK_AUDIO_DEFAULT_RADIO_VALUE} className="py-2">
                <div className="flex flex-col gap-0.5 pl-1 text-left">
                  <span className="font-medium leading-tight">Paramètres audio du système par défaut</span>
                  <span className="text-xs text-muted-foreground">Choix laissé au navigateur</span>
                </div>
              </DropdownMenuRadioItem>
              {audio.inputDevicesForMenu.map((d) => (
                <DropdownMenuRadioItem key={d.deviceId} value={d.deviceId} className="py-2">
                  <span className="line-clamp-3 pl-1 text-left text-sm">{deviceLineLabel(d)}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {audio.inputDevices.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                Aucune entrée détectée. Autorisez le micro dans le navigateur pour lister les appareils.
              </p>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(
              "flex min-h-0 w-full cursor-default flex-row items-center gap-2 rounded-sm px-2 py-2 text-left",
              "data-[state=open]:bg-accent",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold leading-tight">Profil d&apos;entrée audio</span>
              <span className="text-xs font-normal text-muted-foreground">{audio.inputProfileLabel}</span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent sideOffset={6} className="z-[130] min-w-[220px] p-1">
            <DropdownMenuRadioGroup
              value={audio.inputProfile}
              onValueChange={(v) => {
                if (v === "voiceIsolation" || v === "studio" || v === "custom") {
                  audio.setInputProfile(v);
                }
              }}
            >
              <DropdownMenuRadioItem value="voiceIsolation">Isolement de la voix</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="studio">Studio</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="custom">Personnalisés</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </div>

      <DropdownMenuSeparator />

      <div
        className="space-y-2 px-3 py-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-semibold leading-tight">Volume d&apos;entrée</div>
        <Slider
          value={[audio.inputVolume]}
          max={100}
          step={1}
          onValueChange={(v) => audio.setInputVolume(v[0] ?? 100)}
          className="w-full"
          aria-label="Volume d'entrée"
        />
      </div>

      <DropdownMenuSeparator />

      <div className="p-1">
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/preferences" className="flex w-full items-center justify-between gap-2">
            <span className="font-medium">Paramètres vocaux</span>
            <Settings className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  );
}

export function DockOutputSettingsMenuContent({
  audio,
  className,
}: {
  audio: DockAudioSettings;
  className?: string;
}) {
  return (
    <DropdownMenuContent
      side="top"
      align="end"
      sideOffset={8}
      className={cn(
        "z-[120] min-w-[280px] max-w-[min(96vw,360px)] overflow-visible p-0",
        className,
      )}
    >
      <div className="p-1">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(
              "flex min-h-0 w-full cursor-default flex-row items-center gap-2 rounded-sm px-2 py-2 text-left",
              "data-[state=open]:bg-accent",
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold leading-tight">Périphérique de sortie</span>
              <span className="line-clamp-2 text-left text-xs font-normal text-muted-foreground">
                {audio.selectedOutputLabel}
              </span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            sideOffset={6}
            className="z-[130] min-w-[260px] max-w-[min(96vw,380px)] p-1"
          >
            <DropdownMenuRadioGroup
              value={audio.selectedOutputId}
              onValueChange={(v) => v && audio.setSelectedOutputId(v)}
            >
              <DropdownMenuRadioItem value={DOCK_AUDIO_DEFAULT_RADIO_VALUE} className="py-2">
                <div className="flex flex-col gap-0.5 pl-1 text-left">
                  <span className="font-medium leading-tight">Paramètres audio du système par défaut</span>
                  <span className="text-xs text-muted-foreground">Sortie par défaut du navigateur</span>
                </div>
              </DropdownMenuRadioItem>
              {audio.outputDevicesForMenu.map((d) => (
                <DropdownMenuRadioItem key={d.deviceId} value={d.deviceId} className="py-2">
                  <span className="line-clamp-3 pl-1 text-left text-sm">{deviceLineLabel(d)}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {audio.outputDevices.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                Aucune sortie listée. Les noms apparaissent souvent après la première lecture audio.
              </p>
            )}
            {!audio.canSetSinkId && audio.outputDevices.length > 0 && (
              <p className="border-t border-border/60 px-2 py-2 text-[11px] text-muted-foreground">
                Ce navigateur ne permet pas de choisir la sortie (API setSinkId indisponible).
              </p>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </div>

      <DropdownMenuSeparator />

      <div
        className="space-y-2 px-3 py-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-semibold leading-tight">Volume de sortie</div>
        <Slider
          value={[audio.outputVolume]}
          max={100}
          step={1}
          onValueChange={(v) => audio.setOutputVolume(v[0] ?? 100)}
          className="w-full"
          aria-label="Volume de sortie"
        />
      </div>

      <DropdownMenuSeparator />

      <div className="p-1">
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/preferences" className="flex w-full items-center justify-between gap-2">
            <span className="font-medium">Paramètres vocaux</span>
            <Settings className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  );
}
