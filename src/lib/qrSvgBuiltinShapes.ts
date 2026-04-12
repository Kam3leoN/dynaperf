/** Secours si `public/qrcode/dots/<id>.svg` est introuvable (viewBox module 0..1). */
export const BUILTIN_DOT_FALLBACK = '<rect x="0" y="0" width="1" height="1" fill="currentColor"/>';

/** Secours si `public/qrcode/corners/<id>.svg` est introuvable (repère 7×7, viewBox 0..7). */
export const BUILTIN_CORNER_OUTER_FALLBACK =
  '<path fill="currentColor" d="M0 0h7v7H0V0zm1 1v5h5V1H1z"/>';
