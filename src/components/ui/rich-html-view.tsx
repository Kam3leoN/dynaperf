import { cn } from "@/lib/utils";

/** Détecte du HTML issu de TipTap / RichTextEditor (balises courantes). */
function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][a-z0-9]*(?:\s[^>]*)?>/i.test(s.trim());
}

export interface RichHtmlViewProps {
  content: string;
  className?: string;
}

/**
 * Affiche du texte riche (HTML) ou du texte brut selon le contenu.
 * Le HTML est considéré comme provenant de l’app (éditeur admin) ; pas d’échappement supplémentaire.
 */
/** Aperçu liste admin : enlever les balises pour la ligne tronquée. */
export function stripHtmlForPreview(s: string, maxLen: number): string {
  const t = s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t;
}

export function RichHtmlView({ content, className }: RichHtmlViewProps) {
  const trimmed = (content ?? "").trim();
  if (!trimmed) return null;

  if (!looksLikeHtml(trimmed)) {
    return <div className={cn("whitespace-pre-line leading-relaxed", className)}>{trimmed}</div>;
  }

  return (
    <div
      className={cn(
        "rich-html-content prose prose-sm dark:prose-invert max-w-none leading-relaxed [&_a]:text-primary [&_a]:underline",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
}
