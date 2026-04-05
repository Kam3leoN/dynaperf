import { createContext, useContext, useMemo, useState, type ReactNode } from "react";



export type MessagingConversationTarget =

  | { type: "user"; id: string }

  | { type: "group"; id: string };



export interface MessagingGroupRow {

  id: string;

  name: string;

  avatar_url: string | null;

  created_by: string;

  kind: "group" | "salon";

  is_public: boolean;

  lastMsg?: { created_at: string; sender_id?: string } | null;

}



export interface MessagingSidebarApi {

  salonsWithMeta: MessagingGroupRow[];

  groupsWithMeta: MessagingGroupRow[];

  target: MessagingConversationTarget | null;

  setTarget: (t: MessagingConversationTarget | null) => void;

  openNewGroup: () => void;

  openNewSalon: () => void;

  /** Création / édition salons réservée aux admin et super_admin (aligné sur les politiques RLS). */
  canManageSalons: boolean;

  getGroupUnread: (groupId: string) => number;

  /**
   * Enregistre l’ordre des salons publics ou des groupes privés (permission messaging.manage_salons).
   */
  persistChannelOrder: (kind: "salon" | "group", orderedIds: string[]) => Promise<void>;

  viewerUserId: string | undefined;

}

/** Actions / badges dans la barre app (ex. épingle) — renseigné par la page Messages. */
export interface MessagingHeaderChrome {
  pinnedCount: number;
  onOpenPinned: () => void;
}

interface HostValue {

  api: MessagingSidebarApi | null;

  setApi: (a: MessagingSidebarApi | null) => void;

  headerChrome: MessagingHeaderChrome | null;

  setHeaderChrome: (h: MessagingHeaderChrome | null) => void;

}



const MessagingSidebarContext = createContext<HostValue | null>(null);



export function MessagingSidebarProvider({ children }: { children: ReactNode }) {

  const [api, setApi] = useState<MessagingSidebarApi | null>(null);

  const [headerChrome, setHeaderChrome] = useState<MessagingHeaderChrome | null>(null);

  const value = useMemo(() => ({ api, setApi, headerChrome, setHeaderChrome }), [api, headerChrome]);

  return <MessagingSidebarContext.Provider value={value}>{children}</MessagingSidebarContext.Provider>;

}



export function useMessagingSidebarHost(): HostValue {

  const ctx = useContext(MessagingSidebarContext);

  if (!ctx) {

    throw new Error("MessagingSidebarProvider manquant");

  }

  return ctx;

}



export function useOptionalMessagingSidebarHost(): HostValue | null {

  return useContext(MessagingSidebarContext);

}

