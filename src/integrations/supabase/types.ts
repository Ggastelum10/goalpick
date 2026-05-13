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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_fees: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          league_id: string
          paid_at: string | null
          stripe_payment_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          league_id: string
          paid_at?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          league_id?: string
          paid_at?: string | null
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_fees_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          league_id: string | null
          match_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          league_id?: string | null
          match_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          league_id?: string | null
          match_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      game_modes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      group_standings: {
        Row: {
          created_at: string | null
          final_position: number
          group_name: string
          id: string
          team: string
        }
        Insert: {
          created_at?: string | null
          final_position: number
          group_name: string
          id?: string
          team: string
        }
        Update: {
          created_at?: string | null
          final_position?: number
          group_name?: string
          id?: string
          team?: string
        }
        Relationships: []
      }
      league_members: {
        Row: {
          admin_fee_paid: boolean
          bracket_confirmed_at: string | null
          has_paid: boolean
          id: string
          joined_at: string
          league_id: string
          role: string
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          admin_fee_paid?: boolean
          bracket_confirmed_at?: string | null
          has_paid?: boolean
          id?: string
          joined_at?: string
          league_id: string
          role?: string
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          admin_fee_paid?: boolean
          bracket_confirmed_at?: string | null
          has_paid?: boolean
          id?: string
          joined_at?: string
          league_id?: string
          role?: string
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          entry_fee: number
          exact_score_points: number
          expected_members: number
          first_place_percentage: number
          group_position_bonuses: Json
          hide_invite_from_members: boolean
          id: string
          invite_code: string
          is_public: boolean
          is_test: boolean
          logo_offset_x: number
          logo_offset_y: number
          logo_scale: number
          logo_url: string | null
          name: string
          outcome_points: number
          owner_covers_fees: boolean
          owner_id: string
          platform_fees_waived: boolean
          prediction_mode: string
          prepaid_licenses: number
          prize_pool: number
          second_place_percentage: number
          show_prize_distribution: boolean
          show_prize_pool: boolean
          stage_multipliers: Json
          third_place_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          entry_fee?: number
          exact_score_points?: number
          expected_members?: number
          first_place_percentage?: number
          group_position_bonuses?: Json
          hide_invite_from_members?: boolean
          id?: string
          invite_code?: string
          is_public?: boolean
          is_test?: boolean
          logo_offset_x?: number
          logo_offset_y?: number
          logo_scale?: number
          logo_url?: string | null
          name: string
          outcome_points?: number
          owner_covers_fees?: boolean
          owner_id: string
          platform_fees_waived?: boolean
          prediction_mode?: string
          prepaid_licenses?: number
          prize_pool?: number
          second_place_percentage?: number
          show_prize_distribution?: boolean
          show_prize_pool?: boolean
          stage_multipliers?: Json
          third_place_percentage?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          entry_fee?: number
          exact_score_points?: number
          expected_members?: number
          first_place_percentage?: number
          group_position_bonuses?: Json
          hide_invite_from_members?: boolean
          id?: string
          invite_code?: string
          is_public?: boolean
          is_test?: boolean
          logo_offset_x?: number
          logo_offset_y?: number
          logo_scale?: number
          logo_url?: string | null
          name?: string
          outcome_points?: number
          owner_covers_fees?: boolean
          owner_id?: string
          platform_fees_waived?: boolean
          prediction_mode?: string
          prepaid_licenses?: number
          prize_pool?: number
          second_place_percentage?: number
          show_prize_distribution?: boolean
          show_prize_pool?: boolean
          stage_multipliers?: Json
          third_place_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      legal_acceptances: {
        Row: {
          accepted_at: string
          document_id: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          document_id: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          document_id?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          content: string
          created_at: string
          created_by: string
          document_type: string
          file_url: string | null
          id: string
          language: string
          published_at: string | null
          title: string
          version: number
        }
        Insert: {
          content?: string
          created_at?: string
          created_by: string
          document_type: string
          file_url?: string | null
          id?: string
          language?: string
          published_at?: string | null
          title: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          document_type?: string
          file_url?: string | null
          id?: string
          language?: string
          published_at?: string | null
          title?: string
          version?: number
        }
        Relationships: []
      }
      match_reminders: {
        Row: {
          created_at: string
          id: string
          match_id: string
          reminded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          reminded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          reminded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reminders_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team: string
          away_team_flag: string | null
          city: string | null
          created_at: string
          external_id: string | null
          group_name: string | null
          home_score: number | null
          home_team: string
          home_team_flag: string | null
          id: string
          match_date: string
          stage: Database["public"]["Enums"]["tournament_stage"]
          status: Database["public"]["Enums"]["match_status"] | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          away_team: string
          away_team_flag?: string | null
          city?: string | null
          created_at?: string
          external_id?: string | null
          group_name?: string | null
          home_score?: number | null
          home_team: string
          home_team_flag?: string | null
          id?: string
          match_date: string
          stage?: Database["public"]["Enums"]["tournament_stage"]
          status?: Database["public"]["Enums"]["match_status"] | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          away_team?: string
          away_team_flag?: string | null
          city?: string | null
          created_at?: string
          external_id?: string | null
          group_name?: string | null
          home_score?: number | null
          home_team?: string
          home_team_flag?: string | null
          id?: string
          match_date?: string
          stage?: Database["public"]["Enums"]["tournament_stage"]
          status?: Database["public"]["Enums"]["match_status"] | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string
          id: string
          notification_type: string
          payload: Json | null
          sent_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          notification_type: string
          payload?: Json | null
          sent_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          notification_type?: string
          payload?: Json | null
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      original_predictions: {
        Row: {
          created_at: string
          id: string
          league_id: string
          match_id: string
          predicted_away_score: number
          predicted_home_score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          match_id: string
          predicted_away_score: number
          predicted_home_score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          match_id?: string
          predicted_away_score?: number
          predicted_home_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "original_predictions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "original_predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_settings: {
        Row: {
          created_at: string
          entry_fee: number | null
          first_place_percentage: number | null
          id: string
          platform_fee_amount: number | null
          platform_fee_currency: string | null
          second_place_percentage: number | null
          third_place_percentage: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_fee?: number | null
          first_place_percentage?: number | null
          id?: string
          platform_fee_amount?: number | null
          platform_fee_currency?: string | null
          second_place_percentage?: number | null
          third_place_percentage?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_fee?: number | null
          first_place_percentage?: number | null
          id?: string
          platform_fee_amount?: number | null
          platform_fee_currency?: string | null
          second_place_percentage?: number | null
          third_place_percentage?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          created_at: string
          id: string
          league_id: string | null
          match_id: string
          points_earned: number | null
          predicted_away_penalty: number | null
          predicted_away_score: number
          predicted_home_penalty: number | null
          predicted_home_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id?: string | null
          match_id: string
          points_earned?: number | null
          predicted_away_penalty?: number | null
          predicted_away_score: number
          predicted_home_penalty?: number | null
          predicted_home_score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string | null
          match_id?: string
          points_earned?: number | null
          predicted_away_penalty?: number | null
          predicted_away_score?: number
          predicted_home_penalty?: number | null
          predicted_home_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          correct_outcome_count: number | null
          country: string | null
          created_at: string
          display_name: string
          exact_score_count: number | null
          favorite_team: string | null
          goal_difference_accuracy: number | null
          has_accepted_terms: boolean | null
          has_completed_onboarding: boolean | null
          has_paid_entry: boolean | null
          id: string
          notify_email_enabled: boolean | null
          notify_match_results: boolean | null
          notify_points_change: boolean | null
          notify_push_enabled: boolean | null
          notify_standings_update: boolean | null
          preferred_language: string | null
          terms_accepted_at: string | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          correct_outcome_count?: number | null
          country?: string | null
          created_at?: string
          display_name: string
          exact_score_count?: number | null
          favorite_team?: string | null
          goal_difference_accuracy?: number | null
          has_accepted_terms?: boolean | null
          has_completed_onboarding?: boolean | null
          has_paid_entry?: boolean | null
          id?: string
          notify_email_enabled?: boolean | null
          notify_match_results?: boolean | null
          notify_points_change?: boolean | null
          notify_push_enabled?: boolean | null
          notify_standings_update?: boolean | null
          preferred_language?: string | null
          terms_accepted_at?: string | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          correct_outcome_count?: number | null
          country?: string | null
          created_at?: string
          display_name?: string
          exact_score_count?: number | null
          favorite_team?: string | null
          goal_difference_accuracy?: number | null
          has_accepted_terms?: boolean | null
          has_completed_onboarding?: boolean | null
          has_paid_entry?: boolean | null
          id?: string
          notify_email_enabled?: boolean | null
          notify_match_results?: boolean | null
          notify_points_change?: boolean | null
          notify_push_enabled?: boolean | null
          notify_standings_update?: boolean | null
          preferred_language?: string | null
          terms_accepted_at?: string | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          chat_history: Json | null
          created_at: string
          description: string
          id: string
          priority: string
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          chat_history?: Json | null
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          chat_history?: Json | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_matches: {
        Row: {
          away_score: number | null
          away_team: string
          away_team_flag: string | null
          city: string | null
          created_at: string
          external_id: string | null
          group_name: string | null
          home_score: number | null
          home_team: string
          home_team_flag: string | null
          id: string
          match_date: string
          source_match_id: string | null
          stage: Database["public"]["Enums"]["tournament_stage"]
          status: Database["public"]["Enums"]["match_status"] | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          away_team: string
          away_team_flag?: string | null
          city?: string | null
          created_at?: string
          external_id?: string | null
          group_name?: string | null
          home_score?: number | null
          home_team: string
          home_team_flag?: string | null
          id?: string
          match_date: string
          source_match_id?: string | null
          stage?: Database["public"]["Enums"]["tournament_stage"]
          status?: Database["public"]["Enums"]["match_status"] | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          away_team?: string
          away_team_flag?: string | null
          city?: string | null
          created_at?: string
          external_id?: string | null
          group_name?: string | null
          home_score?: number | null
          home_team?: string
          home_team_flag?: string | null
          id?: string
          match_date?: string
          source_match_id?: string | null
          stage?: Database["public"]["Enums"]["tournament_stage"]
          status?: Database["public"]["Enums"]["match_status"] | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_matches_source_match_id_fkey"
            columns: ["source_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      test_user_profiles: {
        Row: {
          avatar_seed: number
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          avatar_seed?: number
          created_at?: string
          display_name: string
          id?: string
        }
        Update: {
          avatar_seed?: number
          created_at?: string
          display_name?: string
          id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      league_members_public: {
        Row: {
          admin_fee_paid: boolean | null
          has_paid: boolean | null
          id: string | null
          joined_at: string | null
          league_id: string | null
          role: string | null
          stripe_payment_id: string | null
          user_id: string | null
        }
        Insert: {
          admin_fee_paid?: never
          has_paid?: never
          id?: string | null
          joined_at?: string | null
          league_id?: string | null
          role?: string | null
          stripe_payment_id?: never
          user_id?: string | null
        }
        Update: {
          admin_fee_paid?: never
          has_paid?: never
          id?: string | null
          joined_at?: string | null
          league_id?: string | null
          role?: string | null
          stripe_payment_id?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_league_chat: { Args: { _league_id: string }; Returns: boolean }
      get_admin_users_summary: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          entry_fees_total: number
          is_admin: boolean
          leagues_joined: number
          platform_fees_count: number
          platform_fees_total: number
          predictions_count: number
          total_count: number
          total_points: number
          user_id: string
        }[]
      }
      get_current_legal_documents:
        | {
            Args: never
            Returns: {
              content: string
              created_at: string
              created_by: string
              document_type: string
              file_url: string | null
              id: string
              language: string
              published_at: string | null
              title: string
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "legal_documents"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_language?: string }
            Returns: {
              content: string
              created_at: string
              created_by: string
              document_type: string
              file_url: string | null
              id: string
              language: string
              published_at: string | null
              title: string
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "legal_documents"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      get_pending_legal_documents:
        | {
            Args: never
            Returns: {
              content: string
              created_at: string
              created_by: string
              document_type: string
              file_url: string | null
              id: string
              language: string
              published_at: string | null
              title: string
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "legal_documents"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_language?: string }
            Returns: {
              content: string
              created_at: string
              created_by: string
              document_type: string
              file_url: string | null
              id: string
              language: string
              published_at: string | null
              title: string
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "legal_documents"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_league_member: {
        Args: { _league_id: string; _user_id: string }
        Returns: boolean
      }
      is_league_owner: {
        Args: { _league_id: string; _user_id: string }
        Returns: boolean
      }
      is_mode_a_locked: { Args: { p_league_id: string }; Returns: boolean }
      is_phase_started: {
        Args: { p_stage: Database["public"]["Enums"]["tournament_stage"] }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      match_status: "scheduled" | "live" | "finished" | "postponed"
      tournament_stage:
        | "group"
        | "round_of_32"
        | "round_of_16"
        | "quarter_final"
        | "semi_final"
        | "third_place"
        | "final"
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
      app_role: ["admin", "user"],
      match_status: ["scheduled", "live", "finished", "postponed"],
      tournament_stage: [
        "group",
        "round_of_32",
        "round_of_16",
        "quarter_final",
        "semi_final",
        "third_place",
        "final",
      ],
    },
  },
} as const
