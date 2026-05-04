import { useState } from "react";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

interface Props {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  className?: string;
}

export function StarRating({ value, onChange, max = 5, className }: Props) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: max }, (_, i) => {
        const starIdx = i + 1;
        const isActive = starIdx <= value;
        const isHovered = starIdx <= hovered;

        return (
          <button
            key={i}
            type="button"
            className={cn(
              "p-0.5 transition-colors duration-m3-standard-accelerate ease-m3-standard-accelerate active:scale-95",
              isActive
                ? "text-yellow-400"
                : isHovered
                  ? "text-yellow-300"
                  : "text-muted-foreground/30"
            )}
            onMouseEnter={() => setHovered(starIdx)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(starIdx === value ? 0 : starIdx)}
          >
            <FontAwesomeIcon icon={faStar} className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}
