import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
  /** If true, use minimal toolbar (just emoji) — good for chat/comments */
  minimal?: boolean;
}

export function RichTextarea({ value, onChange, placeholder, className, rows = 3, disabled, minimal }: RichTextareaProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

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
      // Return empty string if editor is empty
      const text = editor.getText();
      onChange(text.trim() ? html : "");
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2 text-sm",
          `min-h-[${Math.max(rows * 24, 48)}px]`,
        ),
      },
    },
  }, []);

  // Keep editor in sync with external value changes
  // (only if value differs from current editor text)
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

  const ToolBtn = ({ active, onClick, icon, title }: { active?: boolean; onClick: () => void; icon: any; title: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn("h-7 w-7 rounded flex items-center justify-center text-xs transition-colors hover:bg-accent", active && "bg-accent text-accent-foreground")}
      title={title}
    >
      <FontAwesomeIcon icon={icon} className="h-3 w-3" />
    </button>
  );

  return (
    <div className={cn(
      "rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors",
      disabled && "opacity-50 cursor-not-allowed",
      className,
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-border/50 flex-wrap">
        {!minimal && (
          <>
            <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} icon={faBold} title="Gras" />
            <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} icon={faItalic} title="Italique" />
            <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} icon={faUnderline} title="Souligné" />

            <div className="w-px h-5 bg-border/50 mx-0.5" />

            {/* Text color */}
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
                      onClick={() => { c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run(); setColorOpen(false); }}
                      className="h-6 w-6 rounded-full border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.value || "hsl(var(--foreground))" }}
                      title={c.label}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Highlight */}
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
                      onClick={() => { c.value ? editor.chain().focus().toggleHighlight({ color: c.value }).run() : editor.chain().focus().unsetHighlight().run(); setHighlightOpen(false); }}
                      className="h-6 w-6 rounded-full border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: c.value || "transparent" }}
                      title={c.label}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <div className="w-px h-5 bg-border/50 mx-0.5" />

            {/* Alignment */}
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} icon={faAlignLeft} title="Aligner à gauche" />
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} icon={faAlignCenter} title="Centrer" />
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} icon={faAlignRight} title="Aligner à droite" />
            <ToolBtn onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} icon={faAlignJustify} title="Justifier" />

            <div className="w-px h-5 bg-border/50 mx-0.5" />

            {/* Quote */}
            <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} icon={faQuoteRight} title="Citation" />

            {/* Lists */}
            <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} icon={faListUl} title="Liste à puces" />
            <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} icon={faListOl} title="Liste numérotée" />

            {/* Link */}
            <ToolBtn onClick={setLink} active={editor.isActive("link")} icon={faLink} title="Lien" />

            <div className="w-px h-5 bg-border/50 mx-0.5" />
          </>
        )}
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-7 w-7 rounded flex items-center justify-center text-xs transition-colors hover:bg-accent"
              title="Émoticône"
            >
              <FontAwesomeIcon icon={faFaceSmile} className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <div className="grid grid-cols-10 gap-0.5">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="h-8 w-full rounded hover:bg-accent flex items-center justify-center text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
