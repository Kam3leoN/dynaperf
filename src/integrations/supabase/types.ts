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
          heure_evenement: string | null
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
          total_points: number | null
          type_lieu: string | null
          updated_at: string
        }
        Insert: {
          audit_id: string
          created_at?: string
          heure_evenement?: string | null
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
          total_points?: number | null
          type_lieu?: string | null
          updated_at?: string
        }
        Update: {
          audit_id?: string
          created_at?: string
          heure_evenement?: string | null
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
          condition: string
          created_at: string
          description: string
          id: string
          input_type: string
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
          condition?: string
          created_at?: string
          description?: string
          id?: string
          input_type?: string
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
          condition?: string
          created_at?: string
          description?: string
          id?: string
          input_type?: string
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
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          key?: string
          label?: string
          updated_at?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          title?: string | null
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
