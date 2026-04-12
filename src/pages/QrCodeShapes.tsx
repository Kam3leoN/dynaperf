import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";

/**
 * Rappel : les formes SVG du moteur QR sont stockées en base (`qr_shape_library`) et gérées depuis l’administration.
 */
export default function QrCodeShapes() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useAdmin(user);

  return (
    <AppLayout>
      <section className="app-page-shell-wide min-w-0 w-full space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-semibold">Formes du QR</h1>
          <p className="text-sm text-muted-foreground">
            Les modules, repères et voiles sont fournis par la bibliothèque centrale (table{" "}
            <span className="font-mono text-xs">qr_shape_library</span>), identique pour tous les utilisateurs de
            l’application.
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 px-4 py-5 text-sm text-muted-foreground">
          {isAdmin ? (
            <p className="mb-4">
              {isSuperAdmin ? (
                <>
                  En tant que super administrateur, vous pouvez <strong className="text-foreground">créer, modifier et supprimer</strong> les
                  formes depuis la console d’administration.
                </>
              ) : (
                <>
                  Les <strong className="text-foreground">administrateurs</strong> peuvent consulter le catalogue. Seuls les{" "}
                  <strong className="text-foreground">super administrateurs</strong> peuvent modifier les fichiers SVG.
                </>
              )}
            </p>
          ) : (
            <p className="mb-4">La personnalisation des formes est réservée à l’équipe d’administration.</p>
          )}
          {isAdmin ? (
            <Button asChild>
              <Link to="/admin/qr-shapes">Ouvrir la bibliothèque de formes (admin)</Link>
            </Button>
          ) : null}
        </div>
      </section>
    </AppLayout>
  );
}
