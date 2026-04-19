import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends Omit<React.ComponentProps<"input">, "onKeyDown"> {
  /** Style M3 : contour (outlined) ou surface remplie (filled). */
  variant?: "outlined" | "filled";
  /** Entrée déclenche l’action (en plus du comportement clavier existant). */
  onEnterSubmit?: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "outlined", onEnterSubmit, onKeyDown, ...props }, ref) => {
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
          /* MD3 outlined / filled : hauteur 56dp, coins extra-small (4dp), padding horizontal 16dp, corps 16sp */
          "flex h-[var(--m3-field-height)] w-full min-h-0 shrink-0 rounded-[var(--m3-field-radius)] px-[var(--m3-field-padding-x)] py-0 text-base font-normal leading-6 text-foreground shadow-none caret-primary",
          "ring-offset-0 transition-[color,box-shadow,border-color,background-color]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-[0.38]",
          "[&[aria-invalid=true]]:border-destructive [&[aria-invalid=true]]:focus-visible:ring-destructive/25",
          variant === "outlined" &&
            "border border-input bg-background focus-visible:border-primary",
          variant === "filled" &&
            "border border-transparent bg-[hsl(var(--surface-container-highest))] hover:bg-[hsl(var(--surface-container-high))] focus-visible:border-primary",
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
