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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      payment_accounts: {
        Row: {
          balance_usd: number
          balance_zmw: number
          bank_account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          lenco_account_id: string | null
          mobile_money_number: string | null
          mobile_money_provider: string | null
          pending_balance_usd: number
          pending_balance_zmw: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          balance_zmw?: number
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          lenco_account_id?: string | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          pending_balance_usd?: number
          pending_balance_zmw?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          balance_zmw?: number
          bank_account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          lenco_account_id?: string | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          pending_balance_usd?: number
          pending_balance_zmw?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_fee_tiers: {
        Row: {
          created_at: string
          currency: string
          fee_percentage: number
          id: string
          is_active: boolean | null
          max_amount: number | null
          min_amount: number
        }
        Insert: {
          created_at?: string
          currency?: string
          fee_percentage: number
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount: number
        }
        Update: {
          created_at?: string
          currency?: string
          fee_percentage?: number
          id?: string
          is_active?: boolean | null
          max_amount?: number | null
          min_amount?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          address: string | null
          annual_revenue: number | null
          availability_status: string | null
          avatar_url: string | null
          bio: string | null
          business_model: string | null
          business_name: string | null
          card_details: Json | null
          certifications: Json | null
          city: string | null
          compliance_verified: boolean | null
          coordinates: Json | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          documents_submitted: boolean | null
          email: string | null
          employee_count: number | null
          experience_years: number | null
          facebook_url: string | null
          first_name: string | null
          full_name: string | null
          funding_needed: number | null
          funding_stage: string | null
          gaps_identified: string[] | null
          hourly_rate: number | null
          id: string
          industry_sector: string | null
          investment_portfolio: Json | null
          last_name: string | null
          license_number: string | null
          linkedin_url: string | null
          notification_preferences: Json | null
          ownership_structure: string | null
          payment_method: string | null
          payment_phone: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_contact_method: string | null
          preferred_sectors: string[] | null
          profile_completed: boolean | null
          profile_image_url: string | null
          province: string | null
          qualifications: Json | null
          rating: number | null
          registration_number: string | null
          reviews_count: number | null
          sectors: string[] | null
          services_offered: string[] | null
          skills: string[] | null
          specialization: string | null
          target_market: string[] | null
          title: string | null
          total_donated: number | null
          total_invested: number | null
          total_jobs_completed: number | null
          twitter_url: string | null
          updated_at: string
          use_same_phone: boolean | null
          verification_date: string | null
          website_url: string | null
          years_in_business: number | null
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          annual_revenue?: number | null
          availability_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_model?: string | null
          business_name?: string | null
          card_details?: Json | null
          certifications?: Json | null
          city?: string | null
          compliance_verified?: boolean | null
          coordinates?: Json | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          documents_submitted?: boolean | null
          email?: string | null
          employee_count?: number | null
          experience_years?: number | null
          facebook_url?: string | null
          first_name?: string | null
          full_name?: string | null
          funding_needed?: number | null
          funding_stage?: string | null
          gaps_identified?: string[] | null
          hourly_rate?: number | null
          id: string
          industry_sector?: string | null
          investment_portfolio?: Json | null
          last_name?: string | null
          license_number?: string | null
          linkedin_url?: string | null
          notification_preferences?: Json | null
          ownership_structure?: string | null
          payment_method?: string | null
          payment_phone?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_contact_method?: string | null
          preferred_sectors?: string[] | null
          profile_completed?: boolean | null
          profile_image_url?: string | null
          province?: string | null
          qualifications?: Json | null
          rating?: number | null
          registration_number?: string | null
          reviews_count?: number | null
          sectors?: string[] | null
          services_offered?: string[] | null
          skills?: string[] | null
          specialization?: string | null
          target_market?: string[] | null
          title?: string | null
          total_donated?: number | null
          total_invested?: number | null
          total_jobs_completed?: number | null
          twitter_url?: string | null
          updated_at?: string
          use_same_phone?: boolean | null
          verification_date?: string | null
          website_url?: string | null
          years_in_business?: number | null
        }
        Update: {
          account_type?: string | null
          address?: string | null
          annual_revenue?: number | null
          availability_status?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_model?: string | null
          business_name?: string | null
          card_details?: Json | null
          certifications?: Json | null
          city?: string | null
          compliance_verified?: boolean | null
          coordinates?: Json | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          documents_submitted?: boolean | null
          email?: string | null
          employee_count?: number | null
          experience_years?: number | null
          facebook_url?: string | null
          first_name?: string | null
          full_name?: string | null
          funding_needed?: number | null
          funding_stage?: string | null
          gaps_identified?: string[] | null
          hourly_rate?: number | null
          id?: string
          industry_sector?: string | null
          investment_portfolio?: Json | null
          last_name?: string | null
          license_number?: string | null
          linkedin_url?: string | null
          notification_preferences?: Json | null
          ownership_structure?: string | null
          payment_method?: string | null
          payment_phone?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_contact_method?: string | null
          preferred_sectors?: string[] | null
          profile_completed?: boolean | null
          profile_image_url?: string | null
          province?: string | null
          qualifications?: Json | null
          rating?: number | null
          registration_number?: string | null
          reviews_count?: number | null
          sectors?: string[] | null
          services_offered?: string[] | null
          skills?: string[] | null
          specialization?: string | null
          target_market?: string[] | null
          title?: string | null
          total_donated?: number | null
          total_invested?: number | null
          total_jobs_completed?: number | null
          twitter_url?: string | null
          updated_at?: string
          use_same_phone?: boolean | null
          verification_date?: string | null
          website_url?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          account_type: string
          billing_interval: string
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_usd: number
          price_zmw: number
          updated_at: string
        }
        Insert: {
          account_type: string
          billing_interval?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_usd?: number
          price_zmw?: number
          updated_at?: string
        }
        Update: {
          account_type?: string
          billing_interval?: string
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_usd?: number
          price_zmw?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string
          currency: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          lenco_reference: string | null
          lenco_transaction_id: string | null
          metadata: Json | null
          net_amount: number | null
          platform_fee: number | null
          recipient_id: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          lenco_reference?: string | null
          lenco_transaction_id?: string | null
          metadata?: Json | null
          net_amount?: number | null
          platform_fee?: number | null
          recipient_id?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          lenco_reference?: string | null
          lenco_transaction_id?: string | null
          metadata?: Json | null
          net_amount?: number | null
          platform_fee?: number | null
          recipient_id?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      calculate_platform_fee: {
        Args: { p_amount: number; p_currency: string }
        Returns: number
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
      app_role: "admin" | "moderator" | "user"
      payment_status:
        | "pending"
        | "processing"
        | "successful"
        | "failed"
        | "refunded"
        | "cancelled"
      subscription_status:
        | "active"
        | "cancelled"
        | "expired"
        | "past_due"
        | "trialing"
      transaction_type:
        | "service_purchase"
        | "subscription"
        | "platform_fee"
        | "payout"
        | "refund"
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
      payment_status: [
        "pending",
        "processing",
        "successful",
        "failed",
        "refunded",
        "cancelled",
      ],
      subscription_status: [
        "active",
        "cancelled",
        "expired",
        "past_due",
        "trialing",
      ],
      transaction_type: [
        "service_purchase",
        "subscription",
        "platform_fee",
        "payout",
        "refund",
      ],
    },
  },
} as const
