import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBold, faItalic, faUnderline, faListUl, faListOl,
  faFaceSmile, faAlignLeft, faAlignCenter, faAlignRight, faAlignJustify,
  faQuoteRight, faLink, faHighlighter, faPalette,
} from "@fortawesome/free-solid-svg-icons";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";

const EMOJI_LIST = [
  "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
  "😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙",
  "😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔",
  "🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥",
  "😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮",
  "🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐",
  "👍","👎","👏","🙌","🤝","💪","✌️","🤞","🤙","👋",
  "💯","🔥","⭐","❤️","🧡","💛","💚","💙","💜","🖤",
  "✅","❌","⚠️","💡","📌","📎","📊","📈","📉","🎯",
];

const TEXT_COLORS = [
  { label: "Défaut", value: "" },
  { label: "Rouge", value: "#dc2626" },
  { label: "Orange", value: "#ea580c" },
  { label: "Vert", value: "#16a34a" },
  { label: "Bleu", value: "#2563eb" },
  { label: "Violet", value: "#9333ea" },
  { label: "Rose", value: "#db2777" },
  { label: "Gris", value: "#6b7280" },
];

const HIGHLIGHT_COLORS = [
  { label: "Aucun", value: "" },
  { label: "Jaune", value: "#fef08a" },
  { label: "Vert", value: "#bbf7d0" },
  { label: "Bleu", value: "#bfdbfe" },
  { label: "Rose", value: "#fbcfe8" },
  { label: "Orange", value: "#fed7aa" },
];

function twemojiUrl(emoji: string): string {
  const codepoints = Array.from(emoji)
    .filter((char) => char.codePointAt(0) !== 0xfe0f)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter((cp): cp is string => Boolean(cp))
    .join("-");
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
}

type CustomEmoji = { id: string; name: string; dataUrl: string };
type EmojiTab = "favorites" | "custom" | "standard";
const CUSTOM_EMOJIS_STORAGE_KEY = "dynaperf_custom_emojis_v1";
const FAVORITE_EMOJIS_STORAGE_KEY = "dynaperf_favorite_emojis_v1";

function customEmojiToken(name: string): string {
  return `:${name}:`;
}

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
  /** If true, use minimal toolbar (just emoji) — good for chat/comments */
  minimal?: boolean;
  /**
   * Zone de saisie messagerie : grandit avec les lignes (plafond + défilement), type Discord.
   * N’a d’effet qu’avec `minimal`.
   */
  autoGrow?: boolean;
  /**
   * Entrée seule déclenche l’action (ex. envoyer / enregistrer) ; Maj+Entrée conserve un saut de ligne.
   */
  onEnterSubmit?: () => void;
}

/** Barre de formatage : émoticônes toujours à droite. Usages recensés : Messages, Sondages, SuiviActiviteForm, AdminAuditGrid, StepZeroForm, AuditItemDialog, AuditItemCard, rich-textarea. */
export function RichTextEditor({ value, onChange, placeholder, className, rows = 3, disabled, minimal, autoGrow, onEnterSubmit }: RichTextEditorProps) {
  const { user } = useAuth();
  const { isAdmin } = useAdmin(user);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [emojiTab, setEmojiTab] = useState<EmojiTab>("favorites");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const [favoriteEmojiKeys, setFavoriteEmojiKeys] = useState<string[]>([]);

  const onEnterSubmitRef = useRef(onEnterSubmit);
  useEffect(() => {
    onEnterSubmitRef.current = onEnterSubmit;
  }, [onEnterSubmit]);

  /** Mode chat compact : 48px mini ; avec `autoGrow` la hauteur suit le contenu jusqu’au cap parent. */
  const minHeightPx = minimal ? Math.max(rows * 26, 48) : Math.max(rows * 24, 48);

  useEffect(() => {
    try {
      const customRaw = localStorage.getItem(CUSTOM_EMOJIS_STORAGE_KEY);
      const favoritesRaw = localStorage.getItem(FAVORITE_EMOJIS_STORAGE_KEY);
      if (customRaw) {
        const parsed = JSON.parse(customRaw) as CustomEmoji[];
        if (Array.isArray(parsed)) setCustomEmojis(parsed);
      }
      if (favoritesRaw) {
        const parsed = JSON.parse(favoritesRaw) as string[];
        if (Array.isArray(parsed)) setFavoriteEmojiKeys(parsed);
      }
    } catch {
      // Ignore malformed local storage values
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CUSTOM_EMOJIS_STORAGE_KEY, JSON.stringify(customEmojis));
  }, [customEmojis]);

  useEffect(() => {
    localStorage.setItem(FAVORITE_EMOJIS_STORAGE_KEY, JSON.stringify(favoriteEmojiKeys));
  }, [favoriteEmojiKeys]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder: placeholder || "" }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["paragraph", "heading"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(text.trim() ? html : "");
    },
    editorProps: {
      attributes: {
        class: cn(
          "rich-text-editor-root dark:prose-invert max-w-none focus:outline-none",
          minimal && autoGrow
            ? "prose min-h-[48px] w-full px-2 py-0 text-[15px] leading-snug [&_p]:m-0 [&_p]:my-2 [&_p]:min-h-0 [&_p]:text-[15px] [&_p]:leading-snug first:[&_p]:mt-0 last:[&_p]:mb-0 [&_.ProseMirror>p.is-editor-empty:first-child::before]:text-[15px]"
            : minimal
              ? "prose flex min-h-[48px] max-h-12 items-center px-2 py-0 text-[15px] leading-snug [&_p]:m-0 [&_p]:min-h-0 [&_p]:text-[15px] [&_p]:leading-snug first:[&_p]:mt-0 last:[&_p]:mb-0 [&_.ProseMirror>p.is-editor-empty:first-child::before]:text-[15px]"
              : "prose prose-sm px-3 py-2 text-sm",
        ),
        style: `min-height: ${minHeightPx}px`,
      },
      handleKeyDown: (_view, event) => {
        if (!onEnterSubmitRef.current) return false;
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onEnterSubmitRef.current();
          return true;
        }
        return false;
      },
    },
  }, [minimal, autoGrow, rows, placeholder]);

  const lastValueRef = useRef(value);
  if (editor && value !== lastValueRef.current) {
    const currentHtml = editor.getHTML();
    const currentText = editor.getText();
    if (value !== currentHtml && value !== currentText) {
      editor.commands.setContent(value || "");
    }
    lastValueRef.current = value;
  }

  const insertEmoji = useCallback((emoji: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji).run();
    setEmojiOpen(false);
  }, [editor]);

  const insertCustomEmoji = useCallback((emoji: CustomEmoji) => {
    if (!editor) return;
    editor.chain().focus().insertContent(customEmojiToken(emoji.name)).run();
    setEmojiOpen(false);
  }, [editor]);

  const toggleFavorite = useCallback((key: string) => {
    setFavoriteEmojiKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [key, ...prev]));
  }, []);

  const addCustomEmoji = useCallback(async (file: File | null) => {
    if (!file || !isAdmin) return;
    const nameRaw = window.prompt("Nom de l'emoji personnalisé (sans espaces) :", file.name.split(".")[0] || "custom");
    const name = (nameRaw || "").trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("read_failed"));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!dataUrl) return;
    setCustomEmojis((prev) => {
      const next = prev.filter((e) => e.name !== name);
      return [{ id: `${Date.now()}-${name}`, name, dataUrl }, ...next].slice(0, 120);
    });
    setEmojiTab("custom");
  }, [isAdmin]);

  const standardEmojisFiltered = useMemo(() => {
    const q = emojiSearch.trim().toLowerCase();
    if (!q) return EMOJI_LIST;
    return EMOJI_LIST.filter((emoji) => emoji.includes(q));
  }, [emojiSearch]);

  const customEmojisFiltered = useMemo(() => {
    const q = emojiSearch.trim().toLowerCase();
    if (!q) return customEmojis;
    return customEmojis.filter((emoji) => emoji.name.toLowerCase().includes(q));
  }, [emojiSearch, customEmojis]);

  const favoriteStandard = useMemo(
    () => EMOJI_LIST.filter((emoji) => favoriteEmojiKeys.includes(`u:${emoji}`)),
    [favoriteEmojiKeys],
  );

  const favoriteCustom = useMemo(
    () => customEmojis.filter((emoji) => favoriteEmojiKeys.includes(`c:${emoji.id}`)),
    [favoriteEmojiKeys, customEmojis],
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL du lien :", editor.getAttributes("link").href || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({ active, onClick, icon, title }: { active?: boolean; onClick: () => void; icon: IconDefinition; title: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn("h-7 w-7 rounded flex items-center justify-center text-xs transition-colors hover:bg-accent", active && "bg-accent text-accent-foreground")}
      title={title}
    >
      <FontAwesomeIcon icon={icon} className="h-3 w-3" />
    </button>
  );

  const emojiPopover = (
    <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:bg-accent"
          title="Émoticône"
        >
          <FontAwesomeIcon icon={faFaceSmile} className={minimal ? "h-7 w-7" : "h-6 w-6"} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[24rem] p-2.5" align="end" sideOffset={8}>
        <div className="mb-2 flex items-center gap-1">
          <button type="button" onClick={() => setEmojiTab("favorites")} className={cn("rounded px-2 py-1 text-xs font-medium", emojiTab === "favorites" ? "bg-accent" : "hover:bg-accent/60")}>Favoris</button>
          <button type="button" onClick={() => setEmojiTab("custom")} className={cn("rounded px-2 py-1 text-xs font-medium", emojiTab === "custom" ? "bg-accent" : "hover:bg-accent/60")}>Personnalisés</button>
          <button type="button" onClick={() => setEmojiTab("standard")} className={cn("rounded px-2 py-1 text-xs font-medium", emojiTab === "standard" ? "bg-accent" : "hover:bg-accent/60")}>Standards</button>
          {isAdmin && (
            <label className="ml-auto cursor-pointer rounded border border-border px-2 py-1 text-xs hover:bg-accent/60">
              + Ajouter
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void addCustomEmoji(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          )}
        </div>
        <input
          type="text"
          value={emojiSearch}
          onChange={(e) => setEmojiSearch(e.target.value)}
          placeholder="Rechercher un emoji..."
          className="mb-2 h-9 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="max-h-[300px] overflow-y-auto">
          {emojiTab === "favorites" && (
            <div className="space-y-2">
              <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
                {favoriteCustom.map((emoji) => (
                  <button key={emoji.id} type="button" onClick={() => insertCustomEmoji(emoji)} className="relative box-border flex aspect-square h-10 items-center justify-center rounded-md p-1 hover:bg-accent">
                    <img src={emoji.dataUrl} alt={emoji.name} className="h-7 w-7 object-contain" />
                    <span className="absolute right-0 top-0 text-[10px]" onClick={(e) => { e.stopPropagation(); toggleFavorite(`c:${emoji.id}`); }}>★</span>
                  </button>
                ))}
                {favoriteStandard.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="relative box-border flex aspect-square h-10 items-center justify-center rounded-md p-1 hover:bg-accent">
                    <img src={twemojiUrl(emoji)} alt={emoji} className="h-7 w-7" loading="lazy" />
                    <span className="absolute right-0 top-0 text-[10px]" onClick={(e) => { e.stopPropagation(); toggleFavorite(`u:${emoji}`); }}>★</span>
                  </button>
                ))}
              </div>
              {favoriteCustom.length === 0 && favoriteStandard.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">Aucun favori pour le moment.</p>
              )}
            </div>
          )}

          {emojiTab === "custom" && (
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
              {customEmojisFiltered.map((emoji) => (
                <button key={emoji.id} type="button" onClick={() => insertCustomEmoji(emoji)} className="relative box-border flex aspect-square h-10 items-center justify-center rounded-md p-1 hover:bg-accent">
                  <img src={emoji.dataUrl} alt={emoji.name} className="h-7 w-7 object-contain" />
                  <span className="absolute right-0 top-0 text-[10px]" onClick={(e) => { e.stopPropagation(); toggleFavorite(`c:${emoji.id}`); }}>★</span>
                </button>
              ))}
              {customEmojisFiltered.length === 0 && (
                <p className="col-span-full py-4 text-center text-xs text-muted-foreground">Aucun emoji personnalisé.</p>
              )}
            </div>
          )}

          {emojiTab === "standard" && (
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
              {standardEmojisFiltered.map((emoji) => (
                <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="relative box-border flex aspect-square h-10 items-center justify-center rounded-md p-1 hover:bg-accent">
                  <img src={twemojiUrl(emoji)} alt={emoji} className="h-7 w-7" loading="lazy" />
                  <span className="absolute right-0 top-0 text-[10px]" onClick={(e) => { e.stopPropagation(); toggleFavorite(`u:${emoji}`); }}>★</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  if (minimal) {
    if (autoGrow) {
      return (
        <div
          className={cn(
            "flex min-h-12 w-full min-w-0 flex-col overflow-hidden rounded-md border-2 border-input bg-background ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <div className="flex w-full min-w-0 items-end gap-1 px-0">
            <div className="min-h-[48px] max-h-[min(45vh,22rem)] min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [&_.ProseMirror]:block [&_.ProseMirror]:min-h-[3rem] [&_.ProseMirror]:max-w-full [&_.ProseMirror]:py-2 [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-snug">
              <EditorContent editor={editor} />
            </div>
            <div className="flex shrink-0 self-end pb-1">{emojiPopover}</div>
          </div>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "h-12 max-h-12 min-h-12 overflow-hidden rounded-md border-2 border-input bg-background ring-offset-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <div className="flex h-12 w-full max-h-12 min-h-12 items-center gap-1 px-0">
          <div className="min-h-0 min-w-0 flex-1 [&_.ProseMirror]:flex [&_.ProseMirror]:min-h-0 [&_.ProseMirror]:max-h-12 [&_.ProseMirror]:items-center [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:py-0 [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-snug">
            <EditorContent editor={editor} />
          </div>
          <div className="flex shrink-0 items-center">{emojiPopover}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors",
      disabled && "opacity-50 cursor-not-allowed",
      className,
    )}>
      <div className="flex w-full min-h-8 items-center gap-0.5 border-b border-border/50 px-1.5 py-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={faBold} title="Gras" />
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={faItalic} title="Italique" />
            <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={faUnderline} title="Souligné" />

            <div className="w-px h-5 bg-border/50 mx-0.5" />

            <Popover open={colorOpen} onOpenChange={setColorOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="h-7 w-7 rounded flex items-center justify-center text-xs transition-colors hover:bg-accent" title="Couleur du texte">
                  <FontAwesomeIcon icon={faPalette} className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex gap-1">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.value || "default"}
                      type="button"
                      onClick={() => {
                        if (c.value) editor.chain().focus().setColor(c.value).run();
                        else editor.chain().focus().unsetColor().run();
                        setColorOpen(false);
                      }}
                      className="h-6 w-6 rounded-full border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.value || "hsl(var(--foreground))" }}
                      title={c.label}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={highlightOpen} onOpenChange={setHighlightOpen}>
              <PopoverTrigger asChild>
                <button type="button" className={cn("h-7 w-7 rounded flex items-center justify-center text-xs transition-colors hover:bg-accent", editor.isActive("highlight") && "bg-accent")} title="Surligner">
                  <FontAwesomeIcon icon={faHighlighter} className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex gap-1">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.value || "none"}
                      type="button"
                      onClick={() => {
                        if (c.value) editor.chain().focus().toggleHighlight({ color: c.value }).run();
                        else editor.chain().focus().unsetHighlight().run();
                        setHighlightOpen(false);
                      }}
                      className="h-6 w-6 rounded-full border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.value || "transparent" }}
                      title={c.label}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <div className="w-px h-5 bg-border/50 mx-0.5" />

            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={faAlignLeft} title="Aligner à gauche" />
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={faAlignCenter} title="Centrer" />
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={faAlignRight} title="Aligner à droite" />
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} icon={faAlignJustify} title="Justifier" />

            <div className="w-px h-5 bg-border/50 mx-0.5" />

            <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={faQuoteRight} title="Citation" />

            <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={faListUl} title="Liste à puces" />
            <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={faListOl} title="Liste numérotée" />

            <ToolBtn onClick={setLink} active={editor.isActive("link")} icon={faLink} title="Lien" />

            <div className="w-px h-5 bg-border/50 mx-0.5" />
        </div>
        <div className="flex shrink-0 items-center border-l border-border/40 pl-1.5">{emojiPopover}</div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
