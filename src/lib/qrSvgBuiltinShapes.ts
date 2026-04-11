import type { CornerDotType, CornerSquareType, DotType } from "qr-code-styling";

/**
 * Formes de secours (inline SVG) si le fichier sous `public/qrcode/` est absent.
 * Les fichiers remplacent ces formes lorsqu’ils sont présents (même noms que les clés de style).
 */
export const BUILTIN_DOT_SVG: Record<DotType, string> = {
  square: '<rect x="0" y="0" width="1" height="1" fill="currentColor"/>',
  dots: '<circle cx="0.5" cy="0.5" r="0.42" fill="currentColor"/>',
  rounded: '<rect x="0.05" y="0.05" width="0.9" height="0.9" rx="0.2" fill="currentColor"/>',
  "extra-rounded": '<rect x="0.05" y="0.05" width="0.9" height="0.9" rx="0.38" fill="currentColor"/>',
  classy:
    '<rect x="0.08" y="0.08" width="0.84" height="0.84" rx="0.12" fill="currentColor" opacity="0.92"/>',
  "classy-rounded":
    '<rect x="0.08" y="0.08" width="0.84" height="0.84" rx="0.28" fill="currentColor" opacity="0.92"/>',
};

/** Repère 7×7 (coins) — cadre extérieur */
export const BUILTIN_CORNER_OUTER: Record<CornerSquareType, string> = {
  square: '<path fill="currentColor" d="M0 0h7v7H0V0zm1 1v5h5V1H1z"/>',
  dot: '<path fill="currentColor" d="M3.5 0C1.57 0 0 1.57 0 3.5S1.57 7 3.5 7 7 5.43 7 3.5 5.43 0 3.5 0zm0 1a2.5 2.5 0 110 5 2.5 2.5 0 010-5z"/>',
  "extra-rounded":
    '<path fill="currentColor" d="M1 0h5a1 1 0 011 1v5a1 1 0 01-1 1H1a1 1 0 01-1-1V1a1 1 0 011-1zm1 1a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V2a1 1 0 00-1-1H2z"/>',
  rounded:
    '<path fill="currentColor" d="M1.5 0h4A1.5 1.5 0 017 1.5v4A1.5 1.5 0 015.5 7h-4A1.5 1.5 0 010 5.5v-4A1.5 1.5 0 011.5 0zm0 1a.5.5 0 00-.5.5v4a.5.5 0 00.5.5h4a.5.5 0 00.5-.5v-4a.5.5 0 00-.5-.5h-4z"/>',
  dots:
    '<path fill="currentColor" d="M1.5 0h4A1.5 1.5 0 017 1.5v4A1.5 1.5 0 015.5 7h-4A1.5 1.5 0 010 5.5v-4A1.5 1.5 0 011.5 0zm.3 1a.7.7 0 00-.7.7v3.6a.7.7 0 00.7.7h3.4a.7.7 0 00.7-.7V2.7a.7.7 0 00-.7-.7H1.8z"/>',
  classy:
    '<path fill="currentColor" d="M1.5 0h4A1.5 1.5 0 017 1.5v4A1.5 1.5 0 015.5 7h-4A1.5 1.5 0 010 5.5v-4A1.5 1.5 0 011.5 0zm.4 1.1a.9.9 0 00-.9.9v3a.9.9 0 00.9.9h3.2a.9.9 0 00.9-.9v-3a.9.9 0 00-.9-.9H1.9z"/>',
  "classy-rounded":
    '<path fill="currentColor" d="M1.5 0h4A1.5 1.5 0 017 1.5v4A1.5 1.5 0 015.5 7h-4A1.5 1.5 0 010 5.5v-4A1.5 1.5 0 011.5 0zm.35 1.15a.85.85 0 00-.85.85v2.8a.85.85 0 00.85.85h3.3a.85.85 0 00.85-.85V2a.85.85 0 00-.85-.85h-3.3z"/>',
};

/** Œil central (viewBox 0 0 3 3) */
export const BUILTIN_CORNER_INNER: Record<CornerDotType, string> = {
  square: '<rect x="0" y="0" width="3" height="3" fill="currentColor"/>',
  dot: '<circle cx="1.5" cy="1.5" r="1.1" fill="currentColor"/>',
  rounded: '<rect x="0.2" y="0.2" width="2.6" height="2.6" rx="0.6" fill="currentColor"/>',
  "extra-rounded": '<rect x="0.15" y="0.15" width="2.7" height="2.7" rx="1.1" fill="currentColor"/>',
  dots: '<circle cx="1.5" cy="1.5" r="0.85" fill="currentColor"/>',
  classy: '<rect x="0.25" y="0.25" width="2.5" height="2.5" rx="0.35" fill="currentColor"/>',
  "classy-rounded": '<rect x="0.25" y="0.25" width="2.5" height="2.5" rx="0.75" fill="currentColor"/>',
};
