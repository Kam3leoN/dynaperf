import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile } from "@fortawesome/free-solid-svg-icons";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";

import workerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import { DriveEpubPreview } from "@/components/drive/DriveEpubPreview";

const CODE_PREVIEW_MAX = 512 * 1024;

const CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "css", "scss", "sass", "html", "htm",
  "md", "markdown", "yml", "yaml", "sql", "sh", "bash", "svg", "xml", "txt", "env", "log",
]);

export interface DrivePreviewDoc {
  title: string;
  file_name: string;
  mime_type: string | null;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function prismLangFor(ext: string, mime: string | null): string | null {
  if (mime?.includes("json")) return "json";
  switch (ext) {
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "jsx":
      return "jsx";
    case "json":
      return "json";
    case "css":
      return "css";
    case "scss":
    case "sass":
      return "scss";
    case "html":
    case "xml":
    case "svg":
      return "markup";
    case "md":
    case "markdown":
      return "markdown";
    case "sh":
    case "bash":
      return "bash";
    case "sql":
      return "sql";
    case "yml":
    case "yaml":
      return "yaml";
    default:
      return null;
  }
}

function isEpubFile(ext: string, mime: string): boolean {
  return ext === "epub" || (mime.includes("epub") && mime.includes("zip"));
}

function isMobiFamily(ext: string, mime: string | null): boolean {
  return ["mobi", "azw", "azw3", "kf8"].includes(ext) || Boolean(mime?.includes("mobi") || mime?.includes("kindle"));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface DriveFilePreviewProps {
  previewUrl: string;
  doc: DrivePreviewDoc;
}

/**
 * Prévisualisation multi-format : PDF, ePub (epub.js), code (Prism), média HTML5.
 */
export function DriveFilePreview({ previewUrl, doc }: DriveFilePreviewProps) {
  const mime = doc.mime_type || "";
  const ext = extOf(doc.file_name);
  const defaultLayout = useMemo(() => defaultLayoutPlugin(), []);

  const [codeText, setCodeText] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);

  const isImage = mime.startsWith("image/");
  const isPdf = mime.includes("pdf");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const isEpub = isEpubFile(ext, mime);
  const isMobi = isMobiFamily(ext, mime);
  const lang = prismLangFor(ext, mime);
  const fetchAsCode =
    !isPdf &&
    !isImage &&
    !isVideo &&
    !isAudio &&
    !isEpub &&
    !isMobi &&
    (CODE_EXTENSIONS.has(ext) ||
      mime.startsWith("text/") ||
      mime.includes("application/json") ||
      mime.includes("application/javascript") ||
      mime.includes("application/xml") ||
      mime.includes("typescript") ||
      mime.includes("x-yaml"));

  useEffect(() => {
    if (!previewUrl || !fetchAsCode) {
      setCodeText(null);
      setCodeError(null);
      return;
    }

    let cancelled = false;
    setCodeLoading(true);
    setCodeError(null);

    void (async () => {
      try {
        const res = await fetch(previewUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (buf.byteLength > CODE_PREVIEW_MAX) {
          if (!cancelled) {
            setCodeError("Fichier trop volumineux pour l’aperçu code (max 512 Ko).");
            setCodeText(null);
          }
          return;
        }
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
        if (!cancelled) setCodeText(text);
      } catch (e) {
        if (!cancelled) {
          setCodeError(e instanceof Error ? e.message : "Lecture impossible");
          setCodeText(null);
        }
      } finally {
        if (!cancelled) setCodeLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewUrl, fetchAsCode]);

  const highlightedHtml = useMemo(() => {
    if (codeText == null) return null;
    if (["txt", "env", "log"].includes(ext)) return escapeHtml(codeText);
    const grammar = lang || (mime.includes("json") ? "json" : "typescript");
    if (!Prism.languages[grammar]) return escapeHtml(codeText);
    try {
      return Prism.highlight(codeText, Prism.languages[grammar], grammar);
    } catch {
      return escapeHtml(codeText);
    }
  }, [codeText, lang, mime, ext]);

  if (isImage) {
    return (
      <img src={previewUrl} alt={doc.title} className="max-w-full max-h-[70vh] object-contain rounded-lg mx-auto" />
    );
  }

  if (isPdf) {
    return (
      <div className="w-full h-[72vh] border border-border rounded-lg overflow-hidden bg-muted/30">
        <Worker workerUrl={workerUrl}>
          <Viewer fileUrl={previewUrl} plugins={[defaultLayout]} />
        </Worker>
      </div>
    );
  }

  if (isEpub) {
    return <DriveEpubPreview previewUrl={previewUrl} title={doc.title} />;
  }

  if (isMobi) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 px-4 text-center max-w-lg mx-auto">
        <FontAwesomeIcon icon={faFile} className="h-14 w-14 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">
          La lecture intégrée concerne les fichiers <strong>ePub</strong>. Les formats Kindle (.mobi, .azw, .azw3) ne sont pas affichés dans le navigateur — utilisez le bouton « Télécharger » pour les ouvrir sur votre appareil.
        </p>
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        src={previewUrl}
        controls
        playsInline
        className="w-full max-h-[72vh] rounded-lg bg-black"
        preload="metadata"
      />
    );
  }

  if (isAudio) {
    return (
      <div className="w-full py-8 flex flex-col items-center gap-4">
        <audio src={previewUrl} controls className="w-full max-w-md" preload="metadata" />
      </div>
    );
  }

  if (fetchAsCode && (codeLoading || codeText !== null || codeError)) {
    if (codeLoading) {
      return <p className="text-muted-foreground text-center py-12">Chargement du code…</p>;
    }
    if (codeError) {
      return <p className="text-destructive text-center py-8">{codeError}</p>;
    }
    if (highlightedHtml !== null) {
      return (
        <pre className="max-h-[70vh] overflow-auto rounded-lg text-sm p-4 !bg-[#2d2d2d] !m-0 text-left">
          <code
            className="language-none whitespace-pre"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      );
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <FontAwesomeIcon icon={faFile} className="h-16 w-16 text-muted-foreground/40" />
      <p className="text-muted-foreground">Aperçu non disponible pour ce type de fichier</p>
    </div>
  );
}
