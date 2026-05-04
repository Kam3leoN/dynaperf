import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { absoluteAppHomeUrl } from "@/lib/basePath";
import { QrStylingPreview } from "@/components/qr/QrStylingPreview";
import { useQrShapeLibraryMap } from "@/hooks/useQrShapeLibrary";
import { buildQrShapeInnerFragments } from "@/lib/qrShapeMarkup";
import { DEFAULT_QR_STYLE, resolveQrPartColors, type QrStyleConfig } from "@/lib/qrCodeStyle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faDesktop, faGear, faQrcode, faStar } from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const WELCOME_QR_FG = "#111827";

export default function Welcome() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);
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

  const navCardClassName = cn(
    "h-full border-border/60 bg-card shadow-soft transition-all duration-m3-standard ease-m3-standard",
    "hover:border-primary/35 hover:shadow-hover hover:-translate-y-0.5",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
  );

  const iconShellClass = cn(
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
    "bg-primary/10 text-primary transition-colors group-hover:bg-primary/15",
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 pb-8">
        <header>
          <h1 className="text-6xl font-bold tracking-tight text-foreground sm:text-7xl">
            Bonjour, {greeting}.
          </h1>
          <p className="text-muted-foreground m3-body-large mt-2">Par quoi commençons-nous aujourd&apos;hui&nbsp;?</p>
        </header>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          <Link to="/preferences" className="group block min-w-0 w-full">
            <Card className={navCardClassName}>
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <div className={iconShellClass}>
                  <FontAwesomeIcon icon={faGear} className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground transition-colors group-hover:text-primary">Préférences</p>
                </div>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </CardContent>
            </Card>
          </Link>

          <button
            type="button"
            onClick={() => setWelcomeQrOpen(true)}
            className="group block min-w-0 w-full cursor-pointer text-left"
          >
            <Card className={navCardClassName}>
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <div className={iconShellClass}>
                  <FontAwesomeIcon icon={faQrcode} className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground transition-colors group-hover:text-primary">
                    Installer sur votre Smartphone (QrCode)
                  </p>
                </div>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </CardContent>
            </Card>
          </button>

          <button
            type="button"
            onClick={() => void installOnPc()}
            className="group block min-w-0 w-full cursor-pointer text-left"
            title={
              !deferredInstall
                ? "Clique l'icône d'installation dans la barre d'adresse si le prompt n'est pas disponible."
                : "Installer sur ce PC"
            }
          >
            <Card className={navCardClassName}>
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <div className={iconShellClass}>
                  <FontAwesomeIcon icon={faDesktop} className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground transition-colors group-hover:text-primary">
                    Installer sur ce PC
                  </p>
                </div>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </CardContent>
            </Card>
          </button>

          <button
            type="button"
            onClick={() => setFavoritesHelpOpen(true)}
            className="group block min-w-0 w-full cursor-pointer text-left"
            title="Ajouter aux favoris (Ctrl + D ou clic sur l'étoile de l'URL)"
          >
            <Card className={navCardClassName}>
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <div className={iconShellClass}>
                  <FontAwesomeIcon icon={faStar} className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground transition-colors group-hover:text-primary">
                    Ajouter aux favoris
                  </p>
                </div>
                <FontAwesomeIcon
                  icon={faArrowRight}
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </CardContent>
            </Card>
          </button>
        </div>

        <div className="flex justify-center pt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/30 px-3 py-1 text-[10px] font-medium text-muted-foreground">
            v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.0"} —{" "}
            {new Date(typeof __BUILD_DATE__ !== "undefined" ? __BUILD_DATE__ : new Date().toISOString()).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </div>

      <Dialog open={welcomeQrOpen} onOpenChange={setWelcomeQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <DialogTitle>Flashez le Qr Code !</DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm text-muted-foreground">Pour une utilisation sur smartphone</p>
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
              <FontAwesomeIcon icon={faDesktop} className="h-5 w-5" aria-hidden />
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
