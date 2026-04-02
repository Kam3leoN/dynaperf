import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBold, faItalic, faListUl, faListOl, faFaceSmile } from "@fortawesome/free-solid-svg-icons";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder: placeholder || "" }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // Get text content (strip HTML for storage compatibility)
      const text = editor.getText();
      onChange(text);
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
    const currentText = editor.getText();
    if (value !== currentText) {
      editor.commands.setContent(value || "");
    }
    lastValueRef.current = value;
  }

  const insertEmoji = useCallback((emoji: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji).run();
    setEmojiOpen(false);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn(
      "rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-colors",
      disabled && "opacity-50 cursor-not-allowed",
      className,
    )}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-border/50">
        {!minimal && (
          <>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn("h-7 w-7 rounded flex items-center justify-center text-xs transition-colors hover:bg-accent", editor.isActive("bold") && "bg-accent text-accent-foreground")}
              title="Gras"
            >
              <FontAwesomeIcon icon={faBold} className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn("h-7 w-7 rounded flex items-center justify-center text-xs transition-colors hover:bg-accent", editor.isActive("italic") && "bg-accent text-accent-foreground")}
              title="Italique"
            >
              <FontAwesomeIcon icon={faItalic} className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn("h-7 w-7 rounded flex items-center justify-center text-xs transition-colors hover:bg-accent", editor.isActive("bulletList") && "bg-accent text-accent-foreground")}
              title="Liste à puces"
            >
              <FontAwesomeIcon icon={faListUl} className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn("h-7 w-7 rounded flex items-center justify-center text-xs transition-colors hover:bg-accent", editor.isActive("orderedList") && "bg-accent text-accent-foreground")}
              title="Liste numérotée"
            >
              <FontAwesomeIcon icon={faListOl} className="h-3 w-3" />
            </button>
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
