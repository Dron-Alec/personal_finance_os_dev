// Hand-written to match supabase/migrations/*.sql — regenerate with
// `supabase gen types typescript` once the project is linked, and this
// file can be swapped for the generated one without touching call sites.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface CategoryRuleEntry {
  category: string;
  keywords: string[];
}

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          type: string;
          balance: number;
          as_of_date: string;
          bank_format: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          name: string;
          type: string;
          balance?: number;
          as_of_date: string;
          bank_format?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          name?: string;
          type?: string;
          balance?: number;
          as_of_date?: string;
          bank_format?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          scope_type: string;
          account_id: number | null;
          starting_amount: number;
          target_amount: number;
          target_date: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          name: string;
          scope_type: string;
          account_id?: number | null;
          starting_amount?: number;
          target_amount: number;
          target_date: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          name?: string;
          scope_type?: string;
          account_id?: number | null;
          starting_amount?: number;
          target_amount?: number;
          target_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_templates: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          type: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          name: string;
          type: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          name?: string;
          type?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      account_balance_history: {
        Row: {
          id: number;
          account_id: number;
          user_id: string;
          balance: number;
          as_of_date: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          account_id: number;
          user_id?: string;
          balance: number;
          as_of_date: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          account_id?: number;
          user_id?: string;
          balance?: number;
          as_of_date?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_balance_history_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: number;
          user_id: string;
          date: string;
          description: string;
          amount: number;
          bank: string;
          category: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          date: string;
          description: string;
          amount: number;
          bank: string;
          category?: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          date?: string;
          description?: string;
          amount?: number;
          bank?: string;
          category?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      nw_snapshots: {
        Row: {
          id: number;
          user_id: string;
          date: string;
          net_worth: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string;
          date: string;
          net_worth: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          date?: string;
          net_worth?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      category_rules: {
        Row: {
          user_id: string;
          rules: CategoryRuleEntry[];
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          rules: CategoryRuleEntry[];
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          rules?: CategoryRuleEntry[];
          updated_at?: string;
        };
        Relationships: [];
      };
      custom_bank_formats: {
        Row: {
          id: number;
          name: string;
          date_column: string;
          secondary_date_column: string | null;
          description_column: string;
          amount_type: string;
          amount_column: string | null;
          debit_column: string | null;
          credit_column: string | null;
          type_column: string | null;
          category_column: string | null;
          balance_column: string | null;
          number_format: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          date_column: string;
          secondary_date_column?: string | null;
          description_column: string;
          amount_type: string;
          amount_column?: string | null;
          debit_column?: string | null;
          credit_column?: string | null;
          type_column?: string | null;
          category_column?: string | null;
          balance_column?: string | null;
          number_format?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          date_column?: string;
          secondary_date_column?: string | null;
          description_column?: string;
          amount_type?: string;
          amount_column?: string | null;
          debit_column?: string | null;
          credit_column?: string | null;
          type_column?: string | null;
          category_column?: string | null;
          balance_column?: string | null;
          number_format?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      nw_targets: {
        Row: {
          user_id: string;
          quarter: string;
          target_net_worth: number;
        };
        Insert: {
          user_id?: string;
          quarter: string;
          target_net_worth: number;
        };
        Update: {
          user_id?: string;
          quarter?: string;
          target_net_worth?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
