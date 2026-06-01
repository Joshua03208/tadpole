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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          address: string | null
          area_id: string
          booking_url: string | null
          category_id: string
          cost_tier: string
          cover_path: string | null
          created_at: string
          description: string | null
          id: string
          lat: number | null
          lng: number | null
          published_at: string | null
          slug: string
          status: string
          summary: string
          title: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          area_id: string
          booking_url?: string | null
          category_id: string
          cost_tier?: string
          cover_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          published_at?: string | null
          slug: string
          status?: string
          summary: string
          title: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          area_id?: string
          booking_url?: string | null
          category_id?: string
          cost_tier?: string
          cover_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string
          id: string
          name: string
          region: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          region?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          region?: string | null
          slug?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          schema_type: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          schema_type?: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          schema_type?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      guide_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      guides: {
        Row: {
          author_id: string | null
          author_name: string | null
          author_tagline: string | null
          body: string | null
          category_id: string
          cover_path: string | null
          created_at: string
          id: string
          published_at: string | null
          schema_type: string
          slug: string
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          author_tagline?: string | null
          body?: string | null
          category_id: string
          cover_path?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          schema_type?: string
          slug: string
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          author_tagline?: string | null
          body?: string | null
          category_id?: string
          cover_path?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          schema_type?: string
          slug?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guides_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "guide_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          last_read_at: string
          match_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          match_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          match_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          match_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          match_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_locations: {
        Row: {
          id: string
          lat: number
          lng: number
          updated_at: string
        }
        Insert: {
          id: string
          lat: number
          lng: number
          updated_at?: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_locations_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          created_at: string
          date_of_birth: string
          id: string
        }
        Insert: {
          created_at?: string
          date_of_birth: string
          id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area_id: string | null
          area_label: string | null
          area_slug: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          interests: string[]
          onboarded_at: string | null
          parenting_stage: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          area_label?: string | null
          area_slug?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id: string
          interests?: string[]
          onboarded_at?: string | null
          parenting_stage?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          area_label?: string | null
          area_slug?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          interests?: string[]
          onboarded_at?: string | null
          parenting_stage?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          reason: string
          reported_profile_id: string | null
          reporter_id: string | null
          severity: string
          snapshot: Json | null
          status: string
          target_id: string | null
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          reason: string
          reported_profile_id?: string | null
          reporter_id?: string | null
          severity?: string
          snapshot?: Json | null
          status?: string
          target_id?: string | null
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          reason?: string
          reported_profile_id?: string | null
          reporter_id?: string | null
          severity?: string
          snapshot?: Json | null
          status?: string
          target_id?: string | null
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          created_at: string
          direction: string
          id: string
          swiper_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          id?: string
          swiper_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          swiper_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_swiper_id_fkey"
            columns: ["swiper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      immediate_risk_reports: {
        Row: {
          created_at: string | null
          detail: string | null
          id: string | null
          reason: string | null
          reported_profile_id: string | null
          reporter_id: string | null
          severity: string | null
          status: string | null
          target_type: string | null
        }
        Insert: {
          created_at?: string | null
          detail?: string | null
          id?: string | null
          reason?: string | null
          reported_profile_id?: string | null
          reporter_id?: string | null
          severity?: string | null
          status?: string | null
          target_type?: string | null
        }
        Update: {
          created_at?: string | null
          detail?: string | null
          id?: string | null
          reason?: string | null
          reported_profile_id?: string | null
          reporter_id?: string | null
          severity?: string | null
          status?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      block_user: { Args: { p_other: string }; Returns: undefined }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_swipe_deck: {
        Args: {
          p_area_slug?: string
          p_limit?: number
          p_parenting_stage?: string
        }
        Returns: {
          area_label: string
          area_slug: string
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          id: string
          interests: string[]
          parenting_stage: string
        }[]
      }
      has_block_with: { Args: { p_other: string }; Returns: boolean }
      is_moderator: { Args: never; Returns: boolean }
      report_and_block: {
        Args: { p_detail?: string; p_reason: string; p_reported: string }
        Returns: string
      }
      report_message: {
        Args: { p_detail?: string; p_message_id: string; p_reason: string }
        Returns: string
      }
      request_account_deletion: { Args: never; Returns: undefined }
      set_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["user_role"]
          p_user: string
        }
        Returns: undefined
      }
      unmatch: {
        Args: { p_block?: boolean; p_other: string }
        Returns: undefined
      }
      unread_counts: {
        Args: never
        Returns: {
          match_id: string
          unread: number
        }[]
      }
    }
    Enums: {
      user_role: "user" | "verified_expert" | "moderator" | "admin"
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
      user_role: ["user", "verified_expert", "moderator", "admin"],
    },
  },
} as const
