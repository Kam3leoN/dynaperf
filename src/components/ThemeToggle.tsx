import * as React from "react";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ThemeToggle = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, onClick, type = "button", ...props }, ref) => {
    const { theme, setTheme } = useTheme();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        setTheme(theme === "dark" ? "light" : "dark");
      }
    };

    return (
      <Button
        ref={ref}
        type={type}
        variant="outline"
        size="icon"
        className={cn("h-9 w-9 rounded-md", className)}
        onClick={handleClick}
        {...props}
      >
        <FontAwesomeIcon icon={faSun} className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <FontAwesomeIcon icon={faMoon} className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Basculer le thème</span>
      </Button>
    );
  },
);

ThemeToggle.displayName = "ThemeToggle";
