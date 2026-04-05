import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onKeyDown"> {
  /** Entrée seule déclenche l’action ; Maj+Entrée = saut de ligne. */
  onEnterSubmit?: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onEnterSubmit, onKeyDown, ...props }, ref) => {
    const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (onEnterSubmit && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onEnterSubmit();
      }
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        onKeyDown={onEnterSubmit || onKeyDown ? handleKeyDown : onKeyDown}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
