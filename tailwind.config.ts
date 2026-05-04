import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindTypography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /** Aligné sur `SHELL_BREAKPOINT_PX` / `layoutBreakpoints.ts` — utilitaires `shell:*` pour le chrome app. */
      screens: {
        shell: "1024px",
      },
      fontFamily: {
        sans: ["Roboto", "Plus Jakarta Sans", "Lexend", "system-ui", "sans-serif"],
        display: ["Roboto", "Plus Jakarta Sans", "Lexend", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // M3 surface variants
        surface: {
          dim: "hsl(var(--surface-dim))",
          container: "hsl(var(--surface-container))",
          "container-high": "hsl(var(--surface-container-high))",
        },
        "outline-variant": "hsl(var(--outline-variant))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        hover: "var(--shadow-hover)",
        elevated: "var(--shadow-elevated)",
      },
      borderRadius: {
        "4xl": "2rem",
        "3xl": "1.75rem",
        "2xl": "1.5rem",
        xl: "1.25rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      /** M3 Expressive — @see https://m3.material.io/styles/motion/easing-and-duration/tokens-specs */
      transitionDuration: {
        "m3-emphasized": "var(--m3-duration-emphasized)",
        "m3-emphasized-decelerate": "var(--m3-duration-emphasized-decelerate)",
        "m3-emphasized-accelerate": "var(--m3-duration-emphasized-accelerate)",
        "m3-standard": "var(--m3-duration-standard)",
        "m3-standard-decelerate": "var(--m3-duration-standard-decelerate)",
        "m3-standard-accelerate": "var(--m3-duration-standard-accelerate)",
      },
      transitionTimingFunction: {
        "m3-emphasized": "var(--m3-ease-emphasized)",
        "m3-emphasized-decelerate": "var(--m3-ease-emphasized-decelerate)",
        "m3-emphasized-accelerate": "var(--m3-ease-emphasized-accelerate)",
        "m3-standard": "var(--m3-ease-standard)",
        "m3-standard-decelerate": "var(--m3-ease-standard-decelerate)",
        "m3-standard-accelerate": "var(--m3-ease-standard-accelerate)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "m3-skeleton-shimmer": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down":
          "accordion-down var(--m3-duration-standard) var(--m3-ease-standard)",
        "accordion-up":
          "accordion-up var(--m3-duration-standard) var(--m3-ease-standard)",
        "m3-skeleton-shimmer":
          "m3-skeleton-shimmer var(--m3-skeleton-shimmer-duration) var(--m3-skeleton-shimmer-ease) infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindTypography],
} satisfies Config;
