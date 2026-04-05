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

  lastMsg?: { created_at: string } | null;

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

}



interface HostValue {

  api: MessagingSidebarApi | null;

  setApi: (a: MessagingSidebarApi | null) => void;

}



const MessagingSidebarContext = createContext<HostValue | null>(null);



export function MessagingSidebarProvider({ children }: { children: ReactNode }) {

  const [api, setApi] = useState<MessagingSidebarApi | null>(null);

  const value = useMemo(() => ({ api, setApi }), [api]);

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

