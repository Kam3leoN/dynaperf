import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends Omit<React.ComponentProps<"input">, "onKeyDown"> {
  /** Entrée déclenche l’action (en plus du comportement clavier existant). */
  onEnterSubmit?: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onEnterSubmit, onKeyDown, ...props }, ref) => {
    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (onEnterSubmit && e.key === "Enter") {
        e.preventDefault();
        onEnterSubmit();
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors md:text-sm",
          className,
        )}
        ref={ref}
        onKeyDown={onEnterSubmit || onKeyDown ? handleKeyDown : onKeyDown}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
