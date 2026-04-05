import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faMicrophone,
  faMicrophoneSlash,
  faHeadphones,
  faEarDeaf,
} from "@fortawesome/free-solid-svg-icons";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVoicePanelControls } from "@/hooks/useVoicePanelControls";
import { bottomBarChromeClassName } from "@/lib/bottomBarChrome";
import { cn } from "@/lib/utils";

interface DesktopUserDockProps {
  profileSlot: ReactNode;
}

const splitBtnBase =
  "inline-flex h-10 items-stretch overflow-hidden rounded-sm border-2 border-border bg-background/80 text-foreground/80";

/**
 * Barre flottante bas-gauche (lg+) : profil, micro, sourdine, préférences — style proche du dock Discord.
 */
export function DesktopUserDock({ profileSlot }: DesktopUserDockProps) {
  const { micMuted, deafened, toggleMic, toggleDeafen } = useVoicePanelControls();

  return (
    <div
      className="pointer-events-none hidden shell:block fixed bottom-0 left-0 z-[52] w-[360px] p-2 pb-3"
      role="presentation"
    >
      <div
        className={cn("pointer-events-auto", bottomBarChromeClassName)}
        role="region"
        aria-label="Profil, audio et préférences"
      >
        <div className="min-w-0 flex-1 overflow-hidden flex justify-start">{profileSlot}</div>

        <div className={splitBtnBase} role="group" aria-label="Microphone">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleMic}
                aria-pressed={micMuted}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center transition-colors hover:bg-secondary/80",
                  micMuted && "bg-destructive/15 text-destructive hover:bg-destructive/20",
                )}
              >
                <FontAwesomeIcon
                  icon={micMuted ? faMicrophoneSlash : faMicrophone}
                  className="h-[17px] w-[17px]"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {micMuted ? "Réactiver le micro" : "Rendre muet"}
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-8 shrink-0 items-center justify-center border-l border-border/50 hover:bg-secondary/80"
                    aria-label="Options du micro"
                  >
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                Options d&apos;entrée
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="top" align="end" className="min-w-[12rem]">
              <DropdownMenuItem asChild>
                <Link to="/preferences">Paramètres vocaux (préférences)</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className={splitBtnBase} role="group" aria-label="Sortie audio">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleDeafen}
                aria-pressed={deafened}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center transition-colors hover:bg-secondary/80",
                  deafened && "bg-destructive/15 text-destructive hover:bg-destructive/20",
                )}
              >
                <FontAwesomeIcon
                  icon={deafened ? faEarDeaf : faHeadphones}
                  className="h-[17px] w-[17px]"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {deafened ? "Réactiver le son" : "Rendre sourd"}
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-8 shrink-0 items-center justify-center border-l border-border/50 hover:bg-secondary/80"
                    aria-label="Options de sortie audio"
                  >
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                Options de sortie
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="top" align="end" className="min-w-[12rem]">
              <DropdownMenuItem asChild>
                <Link to="/preferences">Paramètres audio (préférences)</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Link
              to="/preferences"
              className="h-10 w-10 shrink-0 rounded-sm flex items-center justify-center hover:bg-secondary/60 transition-colors border-2 border-transparent"
              aria-label="Paramètres utilisateur"
            >
              <FontAwesomeIcon icon={faGear} className="h-[18px] w-[18px] text-foreground/60" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            Paramètres utilisateur
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
