import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { OnlineAvatars } from "@/components/OnlineAvatars";
import { GamificationWidget } from "@/components/GamificationWidget";
import { useGamification } from "@/hooks/useGamification";
import { BadgeReward } from "@/components/BadgeReward";
import { QRCodeSVG } from "qrcode.react";
import PwaIcon from "/pwaDynaperf.svg";

export default function Welcome() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState<string | null>(null);
  const { streaks, earnedBadges, allBadges, newBadge, dismissBadge } = useGamification();

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

  const greeting = firstName ?? user?.email?.split("@")[0] ?? "Utilisateur";

  const appUrl = "https://kam3leon.github.io/dynaperf/";

  return (
    <AppLayout>
      <BadgeReward badge={newBadge} onDismiss={dismissBadge} />

      <section className="min-h-[calc(100dvh-12rem)] flex flex-col items-center justify-center px-2 py-6">
        <div className="text-center max-w-lg w-full flex-1 flex flex-col items-center justify-center gap-7">
          <OnlineAvatars />

          <div>
            <h1 className="m3-display-medium text-foreground font-display">
              Bonjour {greeting} <span className="inline-block animate-bounce">😉</span>
            </h1>
            <p className="text-muted-foreground m3-body-large mt-2">
              Bienvenue sur DynaPerf
            </p>
          </div>

          {/* QR Code for mobile install */}
          <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-card border border-border/30 shadow-soft">
            <p className="m3-title-medium text-foreground">📱 Installe l'app sur ton smartphone</p>
            <div className="bg-white p-3 rounded-2xl shadow-soft">
              <QRCodeSVG
                value={appUrl}
                size={160}
                level="M"
                imageSettings={{
                  src: PwaIcon,
                  x: undefined,
                  y: undefined,
                  height: 28,
                  width: 28,
                  excavate: true,
                }}
              />
            </div>
            <p className="m3-body-medium text-muted-foreground max-w-[260px]">
              Scanne ce QR code avec ton téléphone, puis ajoute l'app à ton écran d'accueil
            </p>
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
            v{(globalThis as any).__APP_VERSION__ ?? typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'} — {new Date(typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toISOString()).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </section>
    </AppLayout>
  );
}
