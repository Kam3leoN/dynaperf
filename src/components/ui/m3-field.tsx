import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Material You 3 Expressive — Outlined Text Field with floating label.
 *
 * Usage:
 *   <M3Field label="Email" required>
 *     <Input ... />          ← or any control
 *   </M3Field>
 *
 *   <M3Field label="Ville" required>
 *     <AutocompleteInput ... />
 *   </M3Field>
 *
 * The child input MUST NOT have its own border/padding — the wrapper provides them.
 * Pass `filled` prop when the value is non-empty so the label stays floated.
 */

export interface M3FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  required?: boolean;
  /** Force the label into "floated" position (when field has a value). Auto-detected for focus. */
  filled?: boolean;
  /** Error message to display below the field */
  error?: string;
  /** Helper text */
  helper?: string;
  disabled?: boolean;
}

export const M3Field = React.forwardRef<HTMLDivElement, M3FieldProps>(
  ({ label, required, filled, error, helper, disabled, className, children, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const floated = focused || !!filled;

    return (
      <div ref={ref} className={cn("group", className)} {...props}>
        {/* Label above */}
        <span
          className={cn(
            "block mb-1 ml-1 text-xs font-medium",
            focused
              ? "text-primary"
              : error
                ? "text-destructive"
                : "text-muted-foreground"
          )}
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </span>

        {/* Container */}
        <div
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "rounded-xl border bg-transparent transition-all duration-200 min-h-[2.75rem]",
            "flex items-center",
            focused
              ? "border-primary border-2 shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]"
              : error
                ? "border-destructive border-2"
                : "border-input hover:border-foreground/40",
            disabled && "opacity-50 pointer-events-none bg-muted/30"
          )}
        >
          {/* Input area */}
          <div className="flex-1 min-w-0 px-3 py-2 [&_input]:!border-0 [&_input]:!bg-transparent [&_input]:!shadow-none [&_input]:!outline-none [&_input]:!ring-0 [&_input]:!ring-offset-0 [&_input]:p-0 [&_input]:h-auto [&_input]:text-sm [&_input]:w-full [&_input]:focus-visible:!ring-0 [&_input]:focus-visible:!outline-none [&_input]:focus-visible:!ring-offset-0 [&_select]:!border-0 [&_select]:!bg-transparent [&_select]:!shadow-none [&_select]:!outline-none [&_select]:!ring-0 [&_select]:p-0 [&_textarea]:!border-0 [&_textarea]:!bg-transparent [&_textarea]:!shadow-none [&_textarea]:!outline-none [&_textarea]:p-0 [&_textarea]:!ring-0 [&_textarea]:focus-visible:!ring-0 [&_textarea]:focus-visible:!ring-offset-0 [&_button]:!border-0 [&_button]:!shadow-none [&_button]:!ring-0 [&_button]:focus-visible:!ring-0 [&_button]:focus-visible:!ring-offset-0 [&>button]:w-full [&>button]:justify-start [&>button]:h-auto [&>button]:p-0 [&>button]:!bg-transparent [&>button]:text-sm [&>button]:font-normal [&_[role=combobox]]:!border-0 [&_[role=combobox]]:!shadow-none [&_[role=combobox]]:!ring-0 [&_[role=combobox]]:!outline-none [&_[role=combobox]]:!ring-offset-0">
            {children}
          </div>
        </div>

        {/* Helper / Error text */}
        {(error || helper) && (
          <p className={cn(
            "text-[11px] mt-1 ml-3",
            error ? "text-destructive" : "text-muted-foreground"
          )}>
            {error || helper}
          </p>
        )}
      </div>
    );
  }
);

M3Field.displayName = "M3Field";
