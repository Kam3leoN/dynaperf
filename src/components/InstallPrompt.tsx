import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faMobileScreen, faShareNodes, faPlus } from "@fortawesome/free-solid-svg-icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "dynaperf_install_dismissed";
const DISMISS_DAYS = 30;

function isDismissed(): boolean {
  const val = localStorage.getItem(DISMISS_KEY);
  if (!val) return false;
  const dismissed = parseInt(val, 10);
  if (isNaN(dismissed)) return false;
  return Date.now() - dismissed < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as any).standalone === true;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    // Check if mobile
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    if (isIOS()) {
      // iOS doesn't support beforeinstallprompt, show manual guide
      const timer = setTimeout(() => setShow(true), 3000);
      setShowIOSGuide(true);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-28 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 sm:left-auto sm:right-4 sm:max-w-sm safe-area-bottom">
      <Card className="border-primary/30 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FontAwesomeIcon icon={faMobileScreen} className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Installer DynaPerf</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ajoutez l'application sur votre écran d'accueil pour un accès rapide.
              </p>

              {showIOSGuide ? (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">1</span>
                    <span>Appuyez sur <FontAwesomeIcon icon={faShareNodes} className="mx-0.5 h-3 w-3" /> (partager)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">2</span>
                    <span>Choisissez « Sur l'écran d'accueil » <FontAwesomeIcon icon={faPlus} className="mx-0.5 h-3 w-3" /></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-foreground">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">3</span>
                    <span>Appuyez sur « Ajouter »</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <Button size="sm" onClick={handleInstall} className="w-full text-xs h-8">
                    Installer l'application
                  </Button>
                </div>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 rounded-full h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Fermer"
            >
              <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
