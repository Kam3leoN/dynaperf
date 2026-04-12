import type { PresenceStatusDefinitionRow } from "@/lib/presenceStatusDefinition";
import onlineSvg from "@/assets/presence/online.svg?raw";
import idleSvg from "@/assets/presence/idle.svg?raw";
import dndSvg from "@/assets/presence/dnd.svg?raw";
import streamSvg from "@/assets/presence/stream.svg?raw";
import offlineSvg from "@/assets/presence/offline.svg?raw";

const STUB_TS = "1970-01-01T00:00:00.000Z";

/** Valeurs de secours si la table Supabase n’est pas encore chargée ou indisponible. */
export const STATIC_PRESENCE_DEFINITIONS: PresenceStatusDefinitionRow[] = [
  {
    status_key: "online",
    label_fr: "En ligne",
    sort_order: 10,
    svg_markup: onlineSvg,
    fill_color: "#3ba45c",
    show_on_avatar: true,
    created_at: STUB_TS,
    updated_at: STUB_TS,
  },
  {
    status_key: "idle",
    label_fr: "Inactif",
    sort_order: 20,
    svg_markup: idleSvg,
    fill_color: "#f9a51a",
    show_on_avatar: true,
    created_at: STUB_TS,
    updated_at: STUB_TS,
  },
  {
    status_key: "dnd",
    label_fr: "Ne pas déranger",
    sort_order: 30,
    svg_markup: dndSvg,
    fill_color: "#ee4540",
    show_on_avatar: true,
    created_at: STUB_TS,
    updated_at: STUB_TS,
  },
  {
    status_key: "stream",
    label_fr: "En diffusion",
    sort_order: 40,
    svg_markup: streamSvg,
    fill_color: "#593694",
    show_on_avatar: true,
    created_at: STUB_TS,
    updated_at: STUB_TS,
  },
  {
    status_key: "invisible",
    label_fr: "Invisible",
    sort_order: 50,
    svg_markup: "",
    fill_color: null,
    show_on_avatar: false,
    created_at: STUB_TS,
    updated_at: STUB_TS,
  },
  {
    status_key: "offline",
    label_fr: "Hors ligne",
    sort_order: 60,
    svg_markup: offlineSvg,
    fill_color: "#8c95a0",
    show_on_avatar: true,
    created_at: STUB_TS,
    updated_at: STUB_TS,
  },
];
