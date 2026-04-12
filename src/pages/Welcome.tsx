import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { GamificationWidget } from "@/components/GamificationWidget";
import { useGamification } from "@/hooks/useGamification";
import { BadgeReward } from "@/components/BadgeReward";
import installDesktopIcon from "@/assets/install-desktop.svg";
import { absoluteAppHomeUrl } from "@/lib/basePath";
import { QrStylingPreview } from "@/components/qr/QrStylingPreview";
import { useQrShapeLibraryMap } from "@/hooks/useQrShapeLibrary";
import { buildQrShapeInnerFragments } from "@/lib/qrShapeMarkup";
import { DEFAULT_QR_STYLE, resolveQrPartColors, type QrStyleConfig } from "@/lib/qrCodeStyle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQrcode, faStar } from "@fortawesome/free-solid-svg-icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const WELCOME_QR_FG = "#111827";

export default function Welcome() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);
  const { streaks, earnedBadges, allBadges, newBadge, dismissBadge } = useGamification();
  const [welcomeQrOpen, setWelcomeQrOpen] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [favoritesHelpOpen, setFavoritesHelpOpen] = useState(false);
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null);

  const { byId: shapeById } = useQrShapeLibraryMap();

  const welcomeQrStyle = useMemo((): QrStyleConfig => {
    const base: QrStyleConfig = {
      ...DEFAULT_QR_STYLE,
      frame: "none",
      encodeTrackingLink: false,
    };
    return { ...base, partColors: resolveQrPartColors(WELCOME_QR_FG, base) };
  }, []);

  const welcomeQrFragments = useMemo(
    () => (shapeById.size > 0 ? buildQrShapeInnerFragments(welcomeQrStyle, shapeById) : null),
    [welcomeQrStyle, shapeById],
  );

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const full = data?.display_name ?? user.email?.split("@")[0] ?? "Utilisateur";
        setFirstName(full.split(" ")[0]);
      });
  }, [user]);

  useEffect(() => {
    const existing = (window as Window & { __dynaperfInstallPrompt?: BeforeInstallPromptEvent }).__dynaperfInstallPrompt;
    if (existing) setDeferredInstall(existing);

    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      (window as Window & { __dynaperfInstallPrompt?: BeforeInstallPromptEvent }).__dynaperfInstallPrompt = promptEvent;
      setDeferredInstall(promptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setFavoritesHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const greeting = firstName ?? user?.email?.split("@")[0] ?? "Utilisateur";
  /** Lien encodé dans le QR d’installation (origine + base Vite, généré au runtime). */
  const welcomeQrPayload = absoluteAppHomeUrl();

  const installOnPc = async () => {
    if (!deferredInstall) {
      setInstallHelpOpen(true);
      return;
    }
    await deferredInstall.prompt();
    await deferredInstall.userChoice;
    (window as Window & { __dynaperfInstallPrompt?: BeforeInstallPromptEvent }).__dynaperfInstallPrompt = undefined;
    setDeferredInstall(null);
  };

  return (
    <AppLayout>
      <BadgeReward badge={newBadge} onDismiss={dismissBadge} />

      <section className="min-h-[calc(100dvh-12rem)] flex flex-col items-center px-2 py-4">
        <div className="text-center max-w-lg w-full flex-1 flex flex-col items-center gap-7 pb-2">
          <div>
            <h1 className="m3-display-medium text-foreground font-display">
              Bonjour ! {greeting}.
            </h1>
            <p className="text-muted-foreground m3-body-large mt-2">
              Par ou on commence aujourd&apos;hui ?
            </p>
            <div className="mt-3 flex flex-col items-center justify-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setWelcomeQrOpen(true)}>
                <FontAwesomeIcon icon={faQrcode} className="h-4 w-4" />
                Installer sur votre Smartphone (QrCode)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => void installOnPc()}
                title={!deferredInstall ? "Clique l'icône d'installation dans la barre d'adresse si le prompt n'est pas disponible." : "Installer sur ce PC"}
              >
                <img src={installDesktopIcon} alt="" className="h-4 w-4 opacity-85" />
                Installer sur ce PC
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setFavoritesHelpOpen(true)}
                title="Ajouter aux favoris (Ctrl + D ou clic sur l'étoile de l'URL)"
              >
                <FontAwesomeIcon icon={faStar} className="h-4 w-4" />
                Ajouter aux favoris
              </Button>
            </div>
          </div>

          {/* Gamification widget */}
          {streaks && (
            <div className="w-full max-w-sm p-5 rounded-3xl bg-card border border-border/30 shadow-soft">
              <GamificationWidget
                streaks={streaks}
                earnedBadges={earnedBadges}
                allBadges={allBadges}
              />
            </div>
          )}
        </div>

        {/* Version chip */}
        <div className="mt-6 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/30 px-3 py-1 text-[10px] text-muted-foreground font-medium">
            v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'} — {new Date(typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toISOString()).toLocaleDateString("fr-FR")}
          </span>
        </div>

      </section>

      <Dialog open={welcomeQrOpen} onOpenChange={setWelcomeQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <DialogTitle>Flashez le Qr Code !</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center">Pour une utilisation sur smartphone</p>
          <div className="mx-auto flex max-w-[min(100%,280px)] justify-center rounded-2xl bg-white p-4 shadow-soft">
            {welcomeQrFragments ? (
              <div role="img" aria-label="QR code pour ouvrir DynaPerf sur smartphone">
                <QrStylingPreview
                  value={welcomeQrPayload}
                  size={220}
                  fgColor={WELCOME_QR_FG}
                  bgColor="#ffffff"
                  level="M"
                  style={welcomeQrStyle}
                  shapeInnerFragments={welcomeQrFragments}
                  className="!p-0 shadow-none"
                />
              </div>
            ) : (
              <div
                className="flex h-[220px] w-[220px] items-center justify-center text-center text-xs text-muted-foreground"
                role="status"
              >
                Chargement du QR…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={installHelpOpen} onOpenChange={setInstallHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <DialogTitle>Installer sur ce PC</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <img src={installDesktopIcon} alt="" className="h-5 w-5 opacity-85" />
            </div>
            <p className="text-sm text-muted-foreground">
              Pour installer DynaPerf sur ce PC, utilise l&apos;icône d&apos;installation dans la barre d&apos;adresse
              du navigateur (écran + flèche vers le bas).
            </p>
            <Button onClick={() => setInstallHelpOpen(false)}>J&apos;ai compris</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={favoritesHelpOpen} onOpenChange={setFavoritesHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <DialogTitle>Ajouter DynaPerf aux favoris</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FontAwesomeIcon icon={faStar} className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              Utilise <strong>Ctrl + D</strong> (ou <strong>Cmd + D</strong> sur Mac), ou clique sur l&apos;étoile
              dans la barre d&apos;adresse pour enregistrer cette page dans tes favoris.
            </p>
            <Button onClick={() => setFavoritesHelpOpen(false)}>J&apos;ai compris</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
