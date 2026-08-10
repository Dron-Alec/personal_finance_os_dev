// Generated via `mcp__plugin_supabase_supabase__generate_typescript_types`
// against the live schema (ycvxvdtigwkjpwgoiqhz) after migrations 0001-0016.
// Regenerate the same way after any schema change rather than hand-editing.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Narrowed by hand (codegen only knows this column is jsonb) — matches
// lib/constants.ts's CategoryRule shape, kept as a separate interface here
// to avoid this types file importing from app code.
export interface CategoryRuleEntry {
  category: string
  keywords: string[]
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_balance_history: {
        Row: {
          account_id: number
          as_of_date: string
          balance: number
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          account_id: number
          as_of_date: string
          balance: number
          created_at?: string
          id?: never
          user_id?: string
        }
        Update: {
          account_id?: number
          as_of_date?: string
          balance?: number
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "household_account_balances"
            referencedColumns: ["account_id"]
          },
        ]
      }
      account_templates: {
        Row: {
          created_at: string
          id: number
          name: string
          sort_order: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          sort_order?: number
          type: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          sort_order?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          as_of_date: string
          balance: number
          bank_format: string | null
          created_at: string
          household_id: string
          id: number
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          as_of_date: string
          balance?: number
          bank_format?: string | null
          created_at?: string
          household_id: string
          id?: never
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          as_of_date?: string
          balance?: number
          bank_format?: string | null
          created_at?: string
          household_id?: string
          id?: never
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      category_rules: {
        Row: {
          rules: CategoryRuleEntry[]
          updated_at: string
          user_id: string
        }
        Insert: {
          rules: CategoryRuleEntry[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          rules?: CategoryRuleEntry[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_bank_formats: {
        Row: {
          amount_column: string | null
          amount_type: string
          balance_column: string | null
          category_column: string | null
          created_at: string
          created_by: string | null
          credit_column: string | null
          date_column: string
          debit_column: string | null
          description_column: string
          id: number
          name: string
          number_format: string | null
          secondary_date_column: string | null
          type_column: string | null
        }
        Insert: {
          amount_column?: string | null
          amount_type: string
          balance_column?: string | null
          category_column?: string | null
          created_at?: string
          created_by?: string | null
          credit_column?: string | null
          date_column: string
          debit_column?: string | null
          description_column: string
          id?: never
          name: string
          number_format?: string | null
          secondary_date_column?: string | null
          type_column?: string | null
        }
        Update: {
          amount_column?: string | null
          amount_type?: string
          balance_column?: string | null
          category_column?: string | null
          created_at?: string
          created_by?: string | null
          credit_column?: string | null
          date_column?: string
          debit_column?: string | null
          description_column?: string
          id?: never
          name?: string
          number_format?: string | null
          secondary_date_column?: string | null
          type_column?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          account_id: number | null
          contribution_model: string | null
          contribution_params: Json
          created_at: string
          id: number
          name: string
          scope_type: string
          target_amount: number
          target_date: string
          user_id: string
        }
        Insert: {
          account_id?: number | null
          contribution_model?: string | null
          contribution_params?: Json
          created_at?: string
          id?: never
          name: string
          scope_type: string
          target_amount: number
          target_date: string
          user_id?: string
        }
        Update: {
          account_id?: number | null
          contribution_model?: string | null
          contribution_params?: Json
          created_at?: string
          id?: never
          name?: string
          scope_type?: string
          target_amount?: number
          target_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "household_account_balances"
            referencedColumns: ["account_id"]
          },
        ]
      }
      household_invites: {
        Row: {
          created_at: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          invited_email: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          invited_email: string
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          invited_email?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_links: {
        Row: {
          created_at: string
          household_a_id: string
          household_b_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          household_a_id: string
          household_b_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          household_a_id?: string
          household_b_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_links_household_a_id_fkey"
            columns: ["household_a_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_links_household_b_id_fkey"
            columns: ["household_b_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      nw_snapshots: {
        Row: {
          created_at: string
          date: string
          id: number
          net_worth: number
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: never
          net_worth: number
          note?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: never
          net_worth?: number
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nw_targets: {
        Row: {
          quarter: string
          target_net_worth: number
          user_id: string
        }
        Insert: {
          quarter: string
          target_net_worth: number
          user_id?: string
        }
        Update: {
          quarter?: string
          target_net_worth?: number
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          bank: string
          category: string
          created_at: string
          date: string
          description: string
          household_id: string
          id: number
        }
        Insert: {
          amount: number
          bank: string
          category?: string
          created_at?: string
          date: string
          description: string
          household_id: string
          id?: never
        }
        Update: {
          amount?: number
          bank?: string
          category?: string
          created_at?: string
          date?: string
          description?: string
          household_id?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      household_account_balance_history: {
        Row: {
          account_id: number | null
          as_of_date: string | null
          balance: number | null
          household_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_balance_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "household_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_account_balances: {
        Row: {
          account_id: number | null
          account_name: string | null
          account_type: string | null
          as_of_date: string | null
          balance: number | null
          household_id: string | null
        }
        Insert: {
          account_id?: number | null
          account_name?: string | null
          account_type?: string | null
          as_of_date?: string | null
          balance?: number | null
          household_id?: string | null
        }
        Update: {
          account_id?: number | null
          account_name?: string | null
          account_type?: string | null
          as_of_date?: string | null
          balance?: number | null
          household_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_spending_summary: {
        Row: {
          category: string | null
          household_id: string | null
          month: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_household_invite: {
        Args: { invite_token: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
