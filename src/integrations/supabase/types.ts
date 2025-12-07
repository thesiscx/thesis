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
      access_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          investor_id: string | null
          key: string
          last_used_at: string | null
          round_id: string | null
          stakeholder_id: string | null
          status: string
          tool: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          investor_id?: string | null
          key: string
          last_used_at?: string | null
          round_id?: string | null
          stakeholder_id?: string | null
          status?: string
          tool?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          investor_id?: string | null
          key?: string
          last_used_at?: string | null
          round_id?: string | null
          stakeholder_id?: string | null
          status?: string
          tool?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_keys_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_keys_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_keys_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      access_logs: {
        Row: {
          access_key_id: string | null
          action: string
          id: string
          ip_address: string | null
          stakeholder_id: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          access_key_id?: string | null
          action: string
          id?: string
          ip_address?: string | null
          stakeholder_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          access_key_id?: string | null
          action?: string
          id?: string
          ip_address?: string | null
          stakeholder_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_access_key_id_fkey"
            columns: ["access_key_id"]
            isOneToOne: false
            referencedRelation: "access_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_logs_stakeholder_id_fkey"
            columns: ["stakeholder_id"]
            isOneToOne: false
            referencedRelation: "stakeholders"
            referencedColumns: ["id"]
          },
        ]
      }
      action_messages: {
        Row: {
          content: string
          created_at: string
          flow_complete: boolean | null
          flow_data: Json | null
          flow_step: number | null
          flow_type: string | null
          id: string
          message_type: string
          metadata: Json | null
          page_key: string
          round_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          flow_complete?: boolean | null
          flow_data?: Json | null
          flow_step?: number | null
          flow_type?: string | null
          id?: string
          message_type: string
          metadata?: Json | null
          page_key: string
          round_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          flow_complete?: boolean | null
          flow_data?: Json | null
          flow_step?: number | null
          flow_type?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          page_key?: string
          round_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_messages_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      circuit_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_archived: boolean
          role: string
          round_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_archived?: boolean
          role: string
          round_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          role?: string
          round_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circuit_chat_messages_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      dockets: {
        Row: {
          access_key_id: string | null
          amount: number | null
          commitment_flow_state: Json | null
          commitment_status: string | null
          content: Json
          created_at: string
          created_by: string | null
          custom_terms: string | null
          id: string
          investor_address: string | null
          investor_email: string | null
          investor_entity_name: string | null
          investor_entity_type: string | null
          investor_id: string | null
          investor_name: string | null
          investor_phone: string | null
          is_global: boolean
          round_id: string
          show_deal_terms: boolean | null
          status: string
          updated_at: string
          wire_received: boolean | null
          wire_received_at: string | null
        }
        Insert: {
          access_key_id?: string | null
          amount?: number | null
          commitment_flow_state?: Json | null
          commitment_status?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          custom_terms?: string | null
          id?: string
          investor_address?: string | null
          investor_email?: string | null
          investor_entity_name?: string | null
          investor_entity_type?: string | null
          investor_id?: string | null
          investor_name?: string | null
          investor_phone?: string | null
          is_global?: boolean
          round_id: string
          show_deal_terms?: boolean | null
          status?: string
          updated_at?: string
          wire_received?: boolean | null
          wire_received_at?: string | null
        }
        Update: {
          access_key_id?: string | null
          amount?: number | null
          commitment_flow_state?: Json | null
          commitment_status?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          custom_terms?: string | null
          id?: string
          investor_address?: string | null
          investor_email?: string | null
          investor_entity_name?: string | null
          investor_entity_type?: string | null
          investor_id?: string | null
          investor_name?: string | null
          investor_phone?: string | null
          is_global?: boolean
          round_id?: string
          show_deal_terms?: boolean | null
          status?: string
          updated_at?: string
          wire_received?: boolean | null
          wire_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dockets_access_key_id_fkey"
            columns: ["access_key_id"]
            isOneToOne: false
            referencedRelation: "access_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dockets_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dockets_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          description: string | null
          display_name: string | null
          file_path: string
          id: string
          is_public: boolean
          metadata: Json | null
          mime_type: string | null
          name: string
          parsed_content: string | null
          size: number | null
          subcategory: string | null
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          category: string
          description?: string | null
          display_name?: string | null
          file_path: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          mime_type?: string | null
          name: string
          parsed_content?: string | null
          size?: number | null
          subcategory?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          display_name?: string | null
          file_path?: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          parsed_content?: string | null
          size?: number | null
          subcategory?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      investors: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          name: string
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      invite_code_uses: {
        Row: {
          id: string
          invite_code_id: string
          ip_address: string | null
          location: Json | null
          used_at: string
          used_by: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          invite_code_id: string
          ip_address?: string | null
          location?: Json | null
          used_at?: string
          used_by?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          invite_code_id?: string
          ip_address?: string | null
          location?: Json | null
          used_at?: string
          used_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_code_uses_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          owner_id: string | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          owner_id?: string | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          owner_id?: string | null
          used_count?: number | null
        }
        Relationships: []
      }
      memo_versions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          memo_id: string
          version: number
        }
        Insert: {
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          memo_id: string
          version: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          memo_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "memo_versions_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "memos"
            referencedColumns: ["id"]
          },
        ]
      }
      memos: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          investor_id: string | null
          is_global: boolean
          round_id: string
          updated_at: string
          version: number
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          investor_id?: string | null
          is_global?: boolean
          round_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          investor_id?: string | null
          is_global?: boolean
          round_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "memos_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memos_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      petition_content: {
        Row: {
          content: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_draft: boolean | null
          is_published: boolean | null
          published_at: string | null
          published_by: string | null
          updated_at: string | null
          version: number
        }
        Insert: {
          content?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_draft?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          published_by?: string | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          content?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_draft?: boolean | null
          is_published?: boolean | null
          published_at?: string | null
          published_by?: string | null
          updated_at?: string | null
          version?: number
        }
        Relationships: []
      }
      petition_content_versions: {
        Row: {
          content: Json
          content_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          version: number
        }
        Insert: {
          content: Json
          content_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          version: number
        }
        Update: {
          content?: Json
          content_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "petition_content_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "petition_content"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          company_slug: string | null
          created_at: string
          description: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          company_slug?: string | null
          created_at?: string
          description?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          company_slug?: string | null
          created_at?: string
          description?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      round_terms: {
        Row: {
          company_name: string | null
          countersign_expiry_hours: number | null
          created_at: string
          discount_rate: number | null
          entity_type: string | null
          id: string
          jurisdiction: string | null
          mfn_enabled: boolean | null
          minimum_ticket: number | null
          pro_rata_enabled: boolean | null
          registered_address: string | null
          round_id: string
          signatory_name: string | null
          signatory_title: string | null
          updated_at: string
          valuation_cap: number | null
          wire_account_name: string | null
          wire_account_number: string | null
          wire_bank_address: string | null
          wire_bank_name: string | null
          wire_instructions: string | null
          wire_reference: string | null
          wire_routing_number: string | null
          wire_swift_code: string | null
        }
        Insert: {
          company_name?: string | null
          countersign_expiry_hours?: number | null
          created_at?: string
          discount_rate?: number | null
          entity_type?: string | null
          id?: string
          jurisdiction?: string | null
          mfn_enabled?: boolean | null
          minimum_ticket?: number | null
          pro_rata_enabled?: boolean | null
          registered_address?: string | null
          round_id: string
          signatory_name?: string | null
          signatory_title?: string | null
          updated_at?: string
          valuation_cap?: number | null
          wire_account_name?: string | null
          wire_account_number?: string | null
          wire_bank_address?: string | null
          wire_bank_name?: string | null
          wire_instructions?: string | null
          wire_reference?: string | null
          wire_routing_number?: string | null
          wire_swift_code?: string | null
        }
        Update: {
          company_name?: string | null
          countersign_expiry_hours?: number | null
          created_at?: string
          discount_rate?: number | null
          entity_type?: string | null
          id?: string
          jurisdiction?: string | null
          mfn_enabled?: boolean | null
          minimum_ticket?: number | null
          pro_rata_enabled?: boolean | null
          registered_address?: string | null
          round_id?: string
          signatory_name?: string | null
          signatory_title?: string | null
          updated_at?: string
          valuation_cap?: number | null
          wire_account_name?: string | null
          wire_account_number?: string | null
          wire_bank_address?: string | null
          wire_bank_name?: string | null
          wire_instructions?: string | null
          wire_reference?: string | null
          wire_routing_number?: string | null
          wire_swift_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_terms_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: true
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          closed_at: string | null
          closure_notes: string | null
          closure_reason: string | null
          created_at: string
          created_by: string | null
          id: string
          instrument_type: string
          name: string
          round_number: number
          round_type: string
          slug: string
          state: string
          target_raise: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          closed_at?: string | null
          closure_notes?: string | null
          closure_reason?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instrument_type?: string
          name: string
          round_number?: number
          round_type?: string
          slug: string
          state?: string
          target_raise?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          closed_at?: string | null
          closure_notes?: string | null
          closure_reason?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          instrument_type?: string
          name?: string
          round_number?: number
          round_type?: string
          slug?: string
          state?: string
          target_raise?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          created_by: string | null
          docket_id: string | null
          expires_at: string | null
          id: string
          memo_id: string | null
          permissions: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          docket_id?: string | null
          expires_at?: string | null
          id?: string
          memo_id?: string | null
          permissions?: string
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          docket_id?: string | null
          expires_at?: string | null
          id?: string
          memo_id?: string | null
          permissions?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_docket_id_fkey"
            columns: ["docket_id"]
            isOneToOne: false
            referencedRelation: "dockets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_memo_id_fkey"
            columns: ["memo_id"]
            isOneToOne: false
            referencedRelation: "memos"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          docket_id: string
          id: string
          ip_address: string | null
          signature_data: string | null
          signed_at: string
          signer_email: string | null
          signer_name: string
          signer_title: string | null
          signer_type: string
        }
        Insert: {
          docket_id: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          signer_title?: string | null
          signer_type: string
        }
        Update: {
          docket_id?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          signer_title?: string | null
          signer_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_docket_id_fkey"
            columns: ["docket_id"]
            isOneToOne: false
            referencedRelation: "dockets"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholders: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization: string | null
          short_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization?: string | null
          short_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization?: string | null
          short_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      check_invite_code_valid: { Args: { p_code: string }; Returns: Json }
      create_user_invite_codes: {
        Args: { count?: number; user_id: string }
        Returns: undefined
      }
      generate_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_invite_code_usage: {
        Args: { code_value: string }
        Returns: undefined
      }
      insert_access_log: {
        Args: {
          p_access_key_id: string
          p_action: string
          p_ip_address: string
          p_user_agent: string
        }
        Returns: undefined
      }
      validate_and_use_invite_code: {
        Args: {
          p_code: string
          p_ip_address?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
