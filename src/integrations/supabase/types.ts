export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_categories: {
        Row: {
          audit_type_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          audit_type_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          audit_type_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_categories_audit_type_id_fkey"
            columns: ["audit_type_id"]
            isOneToOne: false
            referencedRelation: "audit_types"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_details: {
        Row: {
          audit_id: string
          created_at: string
          heure_debut_prevue: string | null
          heure_debut_reelle: string | null
          heure_evenement: string | null
          heure_fin_prevue: string | null
          heure_fin_reelle: string | null
          id: string
          items: Json
          nb_adherents: number | null
          nb_invites: number | null
          nb_no_show: number | null
          nb_participants: number | null
          nb_rdv_pris: number | null
          nom_club: string | null
          note_sur_10: number | null
          partenaire_referent: string | null
          photos: string[] | null
          qualite_lieu: number | null
          total_points: number | null
          type_lieu: string | null
          updated_at: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          heure_debut_prevue?: string | null
          heure_debut_reelle?: string | null
          heure_evenement?: string | null
          heure_fin_prevue?: string | null
          heure_fin_reelle?: string | null
          id?: string
          items?: Json
          nb_adherents?: number | null
          nb_invites?: number | null
          nb_no_show?: number | null
          nb_participants?: number | null
          nb_rdv_pris?: number | null
          nom_club?: string | null
          note_sur_10?: number | null
          partenaire_referent?: string | null
          photos?: string[] | null
          qualite_lieu?: number | null
          total_points?: number | null
          type_lieu?: string | null
          updated_at?: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          heure_debut_prevue?: string | null
          heure_debut_reelle?: string | null
          heure_evenement?: string | null
          heure_fin_prevue?: string | null
          heure_fin_reelle?: string | null
          id?: string
          items?: Json
          nb_adherents?: number | null
          nb_invites?: number | null
          nb_no_show?: number | null
          nb_participants?: number | null
          nb_rdv_pris?: number | null
          nom_club?: string | null
          note_sur_10?: number | null
          partenaire_referent?: string | null
          photos?: string[] | null
          qualite_lieu?: number | null
          total_points?: number | null
          type_lieu?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_details_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: true
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_items_config: {
        Row: {
          auto_field: string | null
          category_id: string
          checklist_items: Json | null
          comment_y_parvenir: string
          condition: string
          created_at: string
          description: string
          id: string
          input_type: string
          interets: string
          max_points: number
          scoring_rules: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          auto_field?: string | null
          category_id: string
          checklist_items?: Json | null
          comment_y_parvenir?: string
          condition?: string
          created_at?: string
          description?: string
          id?: string
          input_type?: string
          interets?: string
          max_points?: number
          scoring_rules?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          auto_field?: string | null
          category_id?: string
          checklist_items?: Json | null
          comment_y_parvenir?: string
          condition?: string
          created_at?: string
          description?: string
          id?: string
          input_type?: string
          interets?: string
          max_points?: number
          scoring_rules?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_items_config_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "audit_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_types: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          updated_at: string
          version: number
          version_label: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          updated_at?: string
          version?: number
          version_label?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          updated_at?: string
          version?: number
          version_label?: string | null
        }
        Relationships: []
      }
      audits: {
        Row: {
          auditeur: string
          created_at: string
          date: string
          id: string
          lieu: string | null
          mois_versement: string
          note: number | null
          partenaire: string
          statut: string
          type_evenement: string
          updated_at: string
        }
        Insert: {
          auditeur: string
          created_at?: string
          date: string
          id?: string
          lieu?: string | null
          mois_versement: string
          note?: number | null
          partenaire: string
          statut?: string
          type_evenement: string
          updated_at?: string
        }
        Update: {
          auditeur?: string
          created_at?: string
          date?: string
          id?: string
          lieu?: string | null
          mois_versement?: string
          note?: number | null
          partenaire?: string
          statut?: string
          type_evenement?: string
          updated_at?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          adresse: string | null
          agence_mere: string | null
          agence_rattachement: string | null
          created_at: string
          date_creation: string | null
          date_desactivation: string | null
          departement: string | null
          email_president: string | null
          format: string
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          montant_ca: number
          nb_leads_transformes: number
          nb_membres_actifs: number
          nom: string
          president_nom: string
          secteur_id: string | null
          statut: string
          telephone_president: string | null
          telephone_vice_president: string | null
          updated_at: string
          vice_president_nom: string | null
        }
        Insert: {
          adresse?: string | null
          agence_mere?: string | null
          agence_rattachement?: string | null
          created_at?: string
          date_creation?: string | null
          date_desactivation?: string | null
          departement?: string | null
          email_president?: string | null
          format?: string
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          montant_ca?: number
          nb_leads_transformes?: number
          nb_membres_actifs?: number
          nom: string
          president_nom?: string
          secteur_id?: string | null
          statut?: string
          telephone_president?: string | null
          telephone_vice_president?: string | null
          updated_at?: string
          vice_president_nom?: string | null
        }
        Update: {
          adresse?: string | null
          agence_mere?: string | null
          agence_rattachement?: string | null
          created_at?: string
          date_creation?: string | null
          date_desactivation?: string | null
          departement?: string | null
          email_president?: string | null
          format?: string
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          montant_ca?: number
          nb_leads_transformes?: number
          nb_membres_actifs?: number
          nom?: string
          president_nom?: string
          secteur_id?: string | null
          statut?: string
          telephone_president?: string | null
          telephone_vice_president?: string | null
          updated_at?: string
          vice_president_nom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_secteur_id_fkey"
            columns: ["secteur_id"]
            isOneToOne: false
            referencedRelation: "secteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborateur_config: {
        Row: {
          created_at: string
          id: string
          objectif: number
          palier_1: number | null
          palier_2: number | null
          palier_3: number | null
          prime_audit_1: number
          prime_audit_2: number
          prime_audit_3_plus: number
          prime_club_1: number
          prime_club_2: number
          prime_club_3_plus: number
          prime_distanciel_1: number
          prime_distanciel_2: number
          prime_distanciel_3_plus: number
          prime_evenementiel_1: number
          prime_evenementiel_2: number
          prime_evenementiel_3_plus: number
          prime_mep_1: number
          prime_mep_2: number
          prime_mep_3_plus: number
          prime_rdv_1: number
          prime_rdv_2: number
          prime_rdv_3_plus: number
          prime_suivi_1: number
          prime_suivi_2: number
          prime_suivi_3_plus: number
          semaines_indisponibles: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          objectif?: number
          palier_1?: number | null
          palier_2?: number | null
          palier_3?: number | null
          prime_audit_1?: number
          prime_audit_2?: number
          prime_audit_3_plus?: number
          prime_club_1?: number
          prime_club_2?: number
          prime_club_3_plus?: number
          prime_distanciel_1?: number
          prime_distanciel_2?: number
          prime_distanciel_3_plus?: number
          prime_evenementiel_1?: number
          prime_evenementiel_2?: number
          prime_evenementiel_3_plus?: number
          prime_mep_1?: number
          prime_mep_2?: number
          prime_mep_3_plus?: number
          prime_rdv_1?: number
          prime_rdv_2?: number
          prime_rdv_3_plus?: number
          prime_suivi_1?: number
          prime_suivi_2?: number
          prime_suivi_3_plus?: number
          semaines_indisponibles?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          objectif?: number
          palier_1?: number | null
          palier_2?: number | null
          palier_3?: number | null
          prime_audit_1?: number
          prime_audit_2?: number
          prime_audit_3_plus?: number
          prime_club_1?: number
          prime_club_2?: number
          prime_club_3_plus?: number
          prime_distanciel_1?: number
          prime_distanciel_2?: number
          prime_distanciel_3_plus?: number
          prime_evenementiel_1?: number
          prime_evenementiel_2?: number
          prime_evenementiel_3_plus?: number
          prime_mep_1?: number
          prime_mep_2?: number
          prime_mep_3_plus?: number
          prime_rdv_1?: number
          prime_rdv_2?: number
          prime_rdv_3_plus?: number
          prime_suivi_1?: number
          prime_suivi_2?: number
          prime_suivi_3_plus?: number
          semaines_indisponibles?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      french_cities: {
        Row: {
          department: string | null
          id: string
          name: string
          postal_code: string
          region: string | null
        }
        Insert: {
          department?: string | null
          id?: string
          name: string
          postal_code: string
          region?: string | null
        }
        Update: {
          department?: string | null
          id?: string
          name?: string
          postal_code?: string
          region?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partenaires: {
        Row: {
          commission: number
          created_at: string
          date_anniversaire: string | null
          email: string
          genre: string | null
          id: string
          is_cadre_externalise: boolean
          is_directeur_agence: boolean
          is_president_club: boolean
          nom: string
          partenaire_referent: string
          photo_url: string | null
          pole_expertise: string | null
          prenom: string
          secteurs: string[]
          societe: string
          statut: string
          telephone: string
          updated_at: string
        }
        Insert: {
          commission?: number
          created_at?: string
          date_anniversaire?: string | null
          email?: string
          genre?: string | null
          id?: string
          is_cadre_externalise?: boolean
          is_directeur_agence?: boolean
          is_president_club?: boolean
          nom?: string
          partenaire_referent?: string
          photo_url?: string | null
          pole_expertise?: string | null
          prenom?: string
          secteurs?: string[]
          societe?: string
          statut?: string
          telephone?: string
          updated_at?: string
        }
        Update: {
          commission?: number
          created_at?: string
          date_anniversaire?: string | null
          email?: string
          genre?: string | null
          id?: string
          is_cadre_externalise?: boolean
          is_directeur_agence?: boolean
          is_president_club?: boolean
          nom?: string
          partenaire_referent?: string
          photo_url?: string | null
          pole_expertise?: string | null
          prenom?: string
          secteurs?: string[]
          societe?: string
          statut?: string
          telephone?: string
          updated_at?: string
        }
        Relationships: []
      }
      prenoms_genre: {
        Row: {
          created_at: string
          genre: string
          id: string
          prenom: string
        }
        Insert: {
          created_at?: string
          genre: string
          id?: string
          prenom: string
        }
        Update: {
          created_at?: string
          genre?: string
          id?: string
          prenom?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_ip: string | null
          last_login_at: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_ip?: string | null
          last_login_at?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_ip?: string | null
          last_login_at?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      secteurs: {
        Row: {
          created_at: string
          departements: string[]
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          departements?: string[]
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          departements?: string[]
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      suivi_activite: {
        Row: {
          agence: string
          agence_referente: string | null
          created_at: string
          date: string
          id: string
          items: Json
          nb_contrats_depuis_dernier: number | null
          nb_contrats_total: number | null
          observations: string | null
          suivi_par: string
          total_items: number | null
          total_items_valides: number | null
          updated_at: string
        }
        Insert: {
          agence?: string
          agence_referente?: string | null
          created_at?: string
          date?: string
          id?: string
          items?: Json
          nb_contrats_depuis_dernier?: number | null
          nb_contrats_total?: number | null
          observations?: string | null
          suivi_par?: string
          total_items?: number | null
          total_items_valides?: number | null
          updated_at?: string
        }
        Update: {
          agence?: string
          agence_referente?: string | null
          created_at?: string
          date?: string
          id?: string
          items?: Json
          nb_contrats_depuis_dernier?: number | null
          nb_contrats_total?: number | null
          observations?: string | null
          suivi_par?: string
          total_items?: number | null
          total_items_valides?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      suivi_activite_items_config: {
        Row: {
          categorie: string
          conditions: string
          config_version: number
          config_version_label: string | null
          conseils: string
          created_at: string
          id: string
          interets: string
          is_active: boolean
          numero: number
          sort_order: number
          titre: string
          updated_at: string
        }
        Insert: {
          categorie: string
          conditions?: string
          config_version?: number
          config_version_label?: string | null
          conseils?: string
          created_at?: string
          id?: string
          interets?: string
          is_active?: boolean
          numero: number
          sort_order?: number
          titre: string
          updated_at?: string
        }
        Update: {
          categorie?: string
          conditions?: string
          config_version?: number
          config_version_label?: string | null
          conseils?: string
          created_at?: string
          id?: string
          interets?: string
          is_active?: boolean
          numero?: number
          sort_order?: number
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_custom_primes: {
        Row: {
          created_at: string
          id: string
          label: string
          prime_1: number
          prime_2: number
          prime_3_plus: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          prime_1?: number
          prime_2?: number
          prime_3_plus?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          prime_1?: number
          prime_2?: number
          prime_3_plus?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          public_key: string
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          public_key: string
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          public_key?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_config: {
        Args: never
        Returns: {
          created_at: string
          id: string
          objectif: number
          palier_1: number
          palier_2: number
          palier_3: number
          prime_audit_1: number
          prime_audit_2: number
          prime_audit_3_plus: number
          prime_club_1: number
          prime_club_2: number
          prime_club_3_plus: number
          prime_distanciel_1: number
          prime_distanciel_2: number
          prime_distanciel_3_plus: number
          prime_evenementiel_1: number
          prime_evenementiel_2: number
          prime_evenementiel_3_plus: number
          prime_mep_1: number
          prime_mep_2: number
          prime_mep_3_plus: number
          prime_rdv_1: number
          prime_rdv_2: number
          prime_rdv_3_plus: number
          prime_suivi_1: number
          prime_suivi_2: number
          prime_suivi_3_plus: number
          semaines_indisponibles: number
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "redacteur" | "lecteur" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "redacteur", "lecteur", "super_admin"],
    },
  },
} as const
