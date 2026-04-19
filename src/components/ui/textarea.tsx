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
          "flex min-h-[var(--m3-textarea-min-height)] w-full rounded-[var(--m3-field-radius)] border border-input bg-background px-[var(--m3-field-padding-x)] py-3 text-base font-normal leading-6 text-foreground shadow-none caret-primary",
          "ring-offset-0 transition-[color,box-shadow,border-color,background-color]",
          "placeholder:text-muted-foreground/80",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-[0.38]",
          "[&[aria-invalid=true]]:border-destructive [&[aria-invalid=true]]:focus-visible:ring-destructive/25",
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
