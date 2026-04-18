import * as React from "react";
import { createComponent } from "@lit/react";
import { MdIconButton } from "@material/web/iconbutton/icon-button.js";
import { MdFilledButton } from "@material/web/button/filled-button.js";
import { MdOutlinedButton } from "@material/web/button/outlined-button.js";
import { MdTextButton } from "@material/web/button/text-button.js";
import { MdDialog } from "@material/web/dialog/dialog.js";
import { MdFab } from "@material/web/fab/fab.js";
import { MdBrandedFab } from "@material/web/fab/branded-fab.js";
import { MdList } from "@material/web/list/list.js";
import { MdListItem } from "@material/web/list/list-item.js";

/** Composants Material Web (`@material/web`) reliés à React via `@lit/react`. */
export const MwcIconButton = createComponent({
  tagName: "md-icon-button",
  elementClass: MdIconButton,
  react: React,
});

export const MwcFilledButton = createComponent({
  tagName: "md-filled-button",
  elementClass: MdFilledButton,
  react: React,
});

export const MwcOutlinedButton = createComponent({
  tagName: "md-outlined-button",
  elementClass: MdOutlinedButton,
  react: React,
});

export const MwcTextButton = createComponent({
  tagName: "md-text-button",
  elementClass: MdTextButton,
  react: React,
});

export const MwcDialog = createComponent({
  tagName: "md-dialog",
  elementClass: MdDialog,
  react: React,
  events: {
    onClose: "close",
  },
});

export const MwcFab = createComponent({
  tagName: "md-fab",
  elementClass: MdFab,
  react: React,
});

export const MwcBrandedFab = createComponent({
  tagName: "md-branded-fab",
  elementClass: MdBrandedFab,
  react: React,
});

export const MwcList = createComponent({
  tagName: "md-list",
  elementClass: MdList,
  react: React,
});

export const MwcListItem = createComponent({
  tagName: "md-list-item",
  elementClass: MdListItem,
  react: React,
});
