import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { publicAssetUrl } from "@/lib/basePath";

/**
 * Guide d’ajout des formes SVG (modules, repères, habillage) utilisées par le moteur de rendu QR.
 */
export default function QrCodeShapes() {
  return (
    <AppLayout>
      <section className="app-page-shell-wide min-w-0 w-full space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-semibold">Gérer les shapes</h1>
          <p className="text-sm text-muted-foreground">
            Les motifs du QR sont des fichiers SVG dans <code className="rounded bg-muted px-1 py-0.5 text-xs">public/qrcode/</code> :{" "}
            <strong>dots</strong> (modules données), <strong>corners</strong> (repères), <strong>covers</strong> (cadre / texture de fond
            optionnelle).
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Dots — modules</CardTitle>
              <CardDescription>Fichiers numérotés <code className="text-xs">0.svg</code> … <code className="text-xs">15.svg</code></CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Dossier : <code className="rounded bg-muted px-1 py-0.5 text-xs">public/qrcode/dots/</code>
              </p>
              <p>
                Chaque fichier décrit la forme d&apos;un module (cellule). Le rendu applique vos couleurs et le dégradé éventuel sur ces
                tracés.
              </p>
              <p className="text-xs">
                Exemple d&apos;URL servie :{" "}
                <a className="text-primary underline" href={publicAssetUrl("qrcode/dots/7.svg")} target="_blank" rel="noreferrer">
                  dots/7.svg
                </a>
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Corners — repères</CardTitle>
              <CardDescription>Fichiers numérotés pour le cadre extérieur des trois coins</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Dossier : <code className="rounded bg-muted px-1 py-0.5 text-xs">public/qrcode/corners/</code>
              </p>
              <p>Ces SVG définissent la silhouette du grand carré de repérage (œil extérieur). Le centre de l&apos;œil réutilise souvent une forme du dossier dots.</p>
              <p className="text-xs">
                Exemple :{" "}
                <a className="text-primary underline" href={publicAssetUrl("qrcode/corners/3.svg")} target="_blank" rel="noreferrer">
                  corners/3.svg
                </a>
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Covers — cadre / habillage</CardTitle>
              <CardDescription>Texture ou voile léger sur l&apos;ensemble du code (optionnel)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Dossier : <code className="rounded bg-muted px-1 py-0.5 text-xs">public/qrcode/covers/</code> — ex.{" "}
                <code className="text-xs">default.svg</code> pour un léger voile si le fond n&apos;est pas transparent.
              </p>
              <p>
                Après ajout ou modification d&apos;un fichier, redéployez ou rechargez l&apos;app sans cache pour voir le résultat dans
                l&apos;aperçu et l&apos;export SVG.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </AppLayout>
  );
}
