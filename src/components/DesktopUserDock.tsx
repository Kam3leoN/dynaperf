import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMicrophone,
  faMicrophoneSlash,
  faHeadphones,
  faEarDeaf,
} from "@fortawesome/free-solid-svg-icons";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DockMicSettingsMenuContent, DockOutputSettingsMenuContent } from "@/components/dock/DockAudioMenus";
import { useDockAudioSettings } from "@/hooks/useDockAudioSettings";
import { useVoicePanelControls } from "@/hooks/useVoicePanelControls";
import { useNavigationShell } from "@/contexts/NavigationShellContext";
import {
  m3DockSplitChevronMd,
  m3DockSplitDanger,
  m3DockSplitGroup,
  m3DockSplitIconMd,
  m3DockSplitSegmentFirst,
  m3DockSplitSegmentSecond,
} from "@/lib/m3DockSplitButton";
import { cn } from "@/lib/utils";

interface DesktopUserDockProps {
  profileSlot: ReactNode;
}

/** Rail étendu : split M3 taille S (82×40 = 40+2+40) ; 4px entre groupes via `gap-1`. */
function getExpandedSplitClasses() {
  return {
    splitOuter: m3DockSplitGroup.expanded,
    mainBtn: m3DockSplitSegmentFirst,
    chevronBtn: m3DockSplitSegmentSecond,
    iconSm: m3DockSplitIconMd,
    chevronIcon: m3DockSplitChevronMd,
  };
}

/** Rail compact : colonne centrée, split S fixe 82×40 (40+2+40), pas d’étirement `flex-1`. */
function getCompactSplitClasses() {
  const splitOuterNext = m3DockSplitGroup.compactRow;
  return {
    splitOuterNext,
    mainBtn: m3DockSplitSegmentFirst,
    chevronBtn: m3DockSplitSegmentSecond,
    iconSm: m3DockSplitIconMd,
    chevronIcon: m3DockSplitChevronMd,
  };
}

function getDockSplitLayout(compact: boolean) {
  if (compact) {
    const c = getCompactSplitClasses();
    /** Colonne sans carte : espacement vertical `gap-1` (4px) entre profil, micro et audio. */
    return { ...c, micRow: c.splitOuterNext, outRow: c.splitOuterNext };
  }
  const e = getExpandedSplitClasses();
  return { ...e, micRow: e.splitOuter, outRow: e.splitOuter };
}

/**
 * Barre flottante bas-gauche (shell lg+) : profil, micro, sortie audio.
 * z-[46] : au-dessus du rail fixe (z-[45]) qui occupe toute la colonne gauche, sinon les clics
 * sont « mangés » par le `<nav>`. Toujours sous overlays Radix (z-50) et FAB audit (z-58).
 */
export function DesktopUserDock({ profileSlot }: DesktopUserDockProps) {
  const audio = useDockAudioSettings();
  const { micMuted, deafened, toggleMic, toggleDeafen } = useVoicePanelControls({
    inputDeviceId: audio.inputDeviceConstraintId,
  });
  const { railExpanded } = useNavigationShell();
  const compact = !railExpanded;
  const sc = getDockSplitLayout(compact);
  const [micMenuOpen, setMicMenuOpen] = useState(false);
  const [outMenuOpen, setOutMenuOpen] = useState(false);

  const micBlock = (
    <div
      className={sc.micRow}
      role="group"
      aria-label="Microphone"
      data-menu-open={micMenuOpen ? "" : undefined}
    >
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleMic}
            aria-pressed={micMuted}
            className={cn(sc.mainBtn, micMuted && m3DockSplitDanger)}
          >
            <FontAwesomeIcon
              icon={micMuted ? faMicrophoneSlash : faMicrophone}
              className={sc.iconSm}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {micMuted ? "Réactiver le micro" : "Rendre muet"}
        </TooltipContent>
      </Tooltip>
      <DropdownMenu
        onOpenChange={(open) => {
          setMicMenuOpen(open);
          if (open) void audio.ensureAudioDeviceLabelsIfNeeded();
        }}
      >
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(sc.chevronBtn, micMuted && m3DockSplitDanger)}
                aria-label="Options du micro"
              >
                <ChevronDown className={sc.chevronIcon} />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            Options d&apos;entrée
          </TooltipContent>
        </Tooltip>
        <DockMicSettingsMenuContent audio={audio} />
      </DropdownMenu>
    </div>
  );

  const outBlock = (
    <div
      className={sc.outRow}
      role="group"
      aria-label="Sortie audio"
      data-menu-open={outMenuOpen ? "" : undefined}
    >
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleDeafen}
            aria-pressed={deafened}
            className={cn(sc.mainBtn, deafened && m3DockSplitDanger)}
          >
            <FontAwesomeIcon
              icon={deafened ? faEarDeaf : faHeadphones}
              className={sc.iconSm}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {deafened ? "Réactiver le son" : "Rendre sourd"}
        </TooltipContent>
      </Tooltip>
      <DropdownMenu
        onOpenChange={(open) => {
          setOutMenuOpen(open);
          if (open) void audio.refreshDevices();
        }}
      >
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(sc.chevronBtn, deafened && m3DockSplitDanger)}
                aria-label="Options de sortie audio"
              >
                <ChevronDown className={sc.chevronIcon} />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            Options de sortie
          </TooltipContent>
        </Tooltip>
        <DockOutputSettingsMenuContent audio={audio} />
      </DropdownMenu>
    </div>
  );

  return (
    <div
      className="pointer-events-none hidden shell:block fixed bottom-0 left-0 z-[46] w-[var(--shell-nav-rail-width,360px)] p-2 pb-3"
      role="presentation"
    >
      {compact ? (
        <div
          className="pointer-events-auto flex w-full min-w-0 flex-col items-center gap-1 overflow-visible"
          role="region"
          aria-label="Profil et audio"
        >
          {profileSlot}
          {micBlock}
          {outBlock}
        </div>
      ) : (
        <div
          className="pointer-events-auto flex w-full min-w-0 flex-row flex-nowrap items-center justify-start gap-1 px-0.5"
          role="region"
          aria-label="Profil et audio"
        >
          <div className="min-w-0 shrink-0">{profileSlot}</div>
          {micBlock}
          {outBlock}
        </div>
      )}
    </div>
  );
}
