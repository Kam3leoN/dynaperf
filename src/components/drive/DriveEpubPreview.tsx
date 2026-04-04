import { useEffect, useRef, useState, useCallback } from "react";
import ePub from "epubjs";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

type EpubRendition = ReturnType<ReturnType<typeof ePub>["renderTo"]>;

interface DriveEpubPreviewProps {
  previewUrl: string;
  title: string;
}

/**
 * Lecteur ePub intégré (epub.js) : navigation page / chapitre via Précédent / Suivant.
 */
export function DriveEpubPreview({ previewUrl, title }: DriveEpubPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<EpubRendition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !previewUrl) return;

    setError(null);
    setLoading(true);
    el.innerHTML = "";

    const book = ePub(previewUrl);
    let rendition: EpubRendition;

    try {
      rendition = book.renderTo(el, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "none",
        allowScriptedContent: false,
      });
      renditionRef.current = rendition;
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Impossible d’initialiser le lecteur ePub");
      return;
    }

    void rendition
      .display()
      .then(() => setLoading(false))
      .catch((e: unknown) => {
        setLoading(false);
        setError(e instanceof Error ? e.message : "Impossible d’ouvrir ce fichier ePub");
      });

    return () => {
      renditionRef.current = null;
      try {
        rendition.destroy();
      } catch {
        /* ignore */
      }
      try {
        book.destroy();
      } catch {
        /* ignore */
      }
      el.innerHTML = "";
    };
  }, [previewUrl]);

  const goPrev = useCallback(() => {
    void renditionRef.current?.prev()?.catch(() => { /* ignore */ });
  }, []);

  const goNext = useCallback(() => {
    void renditionRef.current?.next()?.catch(() => { /* ignore */ });
  }, []);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={goPrev} aria-label="Page ou chapitre précédent">
          <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
          Précédent
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={goNext} aria-label="Page ou chapitre suivant">
          Suivant
          <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
        </Button>
      </div>

      {loading && !error && (
        <p className="text-sm text-muted-foreground text-center">Ouverture de l’ebook…</p>
      )}

      {error && (
        <p className="text-sm text-destructive text-center px-2">
          {error} — vous pouvez toujours utiliser « Télécharger » pour ouvrir le fichier dans une application dédiée.
        </p>
      )}

      <div
        ref={containerRef}
        className="w-full min-h-[420px] h-[min(72vh,640px)] border border-border rounded-lg bg-muted/20 overflow-hidden relative epub-drive-root"
        aria-label={`Lecture : ${title}`}
      />
    </div>
  );
}
