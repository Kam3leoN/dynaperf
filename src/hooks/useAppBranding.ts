import { useEffect } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";

/**
 * Charge les paramètres d’identité (`app_settings`) et applique titre du document, favicon et méta OG de base.
 * L’icône « apple-touch » suit le thème clair / sombre lorsque des variantes sont définies.
 */
export function useAppBranding() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
      if (cancelled || !data) return;

      if (data.app_name?.trim()) {
        document.title = data.app_name.trim();
      }

      const setLink = (rel: string, href: string, type?: string) => {
        const sel = type ? `link[rel="${rel}"][type="${type}"]` : `link[rel="${rel}"]`;
        let el = document.querySelector(sel) as HTMLLinkElement | null;
        if (!el) {
          el = document.createElement("link");
          el.rel = rel;
          if (type) el.type = type;
          document.head.appendChild(el);
        }
        el.href = href;
      };

      if (data.favicon_url?.trim()) {
        setLink("icon", data.favicon_url.trim());
      }

      const isDark = resolvedTheme === "dark";
      const icon512 =
        (isDark ? data.icon_512_dark_url : data.icon_512_light_url)?.trim() ||
        (isDark ? data.icon_512_light_url : data.icon_512_dark_url)?.trim() ||
        data.icon_512_light_url?.trim() ||
        data.icon_512_dark_url?.trim() ||
        data.icon_512_url?.trim();

      if (icon512) {
        setLink("apple-touch-icon", icon512);
      }

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && data.app_name?.trim()) {
        ogTitle.setAttribute("content", data.app_name.trim());
      }
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle && data.app_name?.trim()) {
        twTitle.setAttribute("content", data.app_name.trim());
      }
      if (data.description?.trim()) {
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute("content", data.description.trim());
        const twDesc = document.querySelector('meta[name="twitter:description"]');
        if (twDesc) twDesc.setAttribute("content", data.description.trim());
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute("content", data.description.trim());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedTheme]);
}
