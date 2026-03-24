import * as React from "react";

const MOBILE_BREAKPOINT = 1024;
const TOUCH_DEVICE_BREAKPOINT = 1280;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const touchQuery = window.matchMedia("(pointer: coarse)");
    const anyTouchQuery = window.matchMedia("(any-pointer: coarse)");

    const evaluate = () => {
      const viewportWidth = window.innerWidth;
      const smallestViewportSide = Math.min(window.innerWidth, window.innerHeight);
      const isNarrow = viewportWidth < MOBILE_BREAKPOINT;
      const isTouchDevice = touchQuery.matches || anyTouchQuery.matches || navigator.maxTouchPoints > 0;
      const userAgentData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
      const isMobileUserAgent = Boolean(userAgentData?.mobile)
        || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

      setIsMobile(
        isNarrow
        || smallestViewportSide < 820
        || (isTouchDevice && isMobileUserAgent && smallestViewportSide < TOUCH_DEVICE_BREAKPOINT),
      );
    };

    mql.addEventListener("change", evaluate);
    touchQuery.addEventListener("change", evaluate);
    anyTouchQuery.addEventListener("change", evaluate);
    evaluate();

    return () => {
      mql.removeEventListener("change", evaluate);
      touchQuery.removeEventListener("change", evaluate);
      anyTouchQuery.removeEventListener("change", evaluate);
    };
  }, []);

  return !!isMobile;
}
