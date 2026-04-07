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

/** Colonne gauche : salons / groupes vs liste de personnes (MP). */
export type MessagingSection = "discussion" | "messagerie";

/** Conversation MP avec au moins un message (hors groupe), triée par activité. */
export interface MessagingDmConversationRow {

  userId: string;

  displayName: string;

  avatarUrl: string | null;

  lastAt: string;

  unread: number;

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

  /**
   * Somme des non lus sur tous les salons + groupes (même règle que la liste).
   * Permet d’aligner le badge « bulle » de la navbar sur les points par canal.
   */
  totalChannelUnread: number;

  /** Non lus MP (aligné sur l’état local des messages). */
  totalDmUnread: number;

  /** Vue courante : salons / groupes ou personnes (historique MP). */
  messagingSection: MessagingSection;

  setMessagingSection: (s: MessagingSection) => void;

  /** Partenaires MP (au moins un message 1:1), du plus récent au plus ancien. */
  dmConversations: MessagingDmConversationRow[];

  /**
   * Retire la conversation MP de la liste pour l’utilisateur courant uniquement
   * (pas de suppression côté autre partie).
   */
  hideDmPartner: (partnerUserId: string) => Promise<void>;

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

