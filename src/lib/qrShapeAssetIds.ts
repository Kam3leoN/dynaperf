import type { CornerSquareType, DotType } from "qr-code-styling";

/**
 * Fichiers numérotés sous `public/qrcode/dots/*.svg` et `public/qrcode/corners/*.svg`.
 * Évite la forme « hachée » (ex. `1.svg`) au profit des variantes lisses (3, 4, 5, etc.).
 */
export const QR_DOT_ASSET_ID: Record<DotType, string> = {
  square: "0",
  dots: "6",
  rounded: "7",
  "extra-rounded": "5",
  classy: "3",
  "classy-rounded": "4",
};

export const QR_CORNER_OUTER_ASSET_ID: Record<CornerSquareType, string> = {
  square: "0",
  dot: "10",
  "extra-rounded": "3",
  rounded: "4",
  dots: "8",
  classy: "5",
  "classy-rounded": "12",
};
