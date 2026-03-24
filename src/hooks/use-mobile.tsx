import * as React from "react";

const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const touchQuery = window.matchMedia("(pointer: coarse)");

    const evaluate = () => {
      const isNarrow = window.innerWidth < MOBILE_BREAKPOINT;
      const isTouch = touchQuery.matches;
      // Touch device under 1024px OR narrow viewport = mobile
      setIsMobile(isNarrow || (isTouch && window.innerWidth < 1024));
    };

    mql.addEventListener("change", evaluate);
    touchQuery.addEventListener("change", evaluate);
    evaluate();

    return () => {
      mql.removeEventListener("change", evaluate);
      touchQuery.removeEventListener("change", evaluate);
    };
  }, []);

  return !!isMobile;
}
