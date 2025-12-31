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
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          donor_email: string | null
          donor_name: string | null
          id: string
          message: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_reference: string | null
          phone_number: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          message?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          phone_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          message?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          phone_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      funding_applications: {
        Row: {
          ai_analysis: Json | null
          ai_match_score: number | null
          business_description: string | null
          business_name: string | null
          created_at: string
          documents: Json | null
          funding_amount_requested: number | null
          funding_purpose: string | null
          id: string
          opportunity_id: string
          review_notes: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          ai_match_score?: number | null
          business_description?: string | null
          business_name?: string | null
          created_at?: string
          documents?: Json | null
          funding_amount_requested?: number | null
          funding_purpose?: string | null
          id?: string
          opportunity_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          ai_match_score?: number | null
          business_description?: string | null
          business_name?: string | null
          created_at?: string
          documents?: Json | null
          funding_amount_requested?: number | null
          funding_purpose?: string | null
          id?: string
          opportunity_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "funding_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_opportunities: {
        Row: {
          amount_display: string | null
          amount_max: number | null
          amount_min: number | null
          application_url: string | null
          applications_count: number | null
          category: string
          contact_email: string | null
          created_at: string
          currency: string | null
          deadline: string | null
          description: string | null
          eligibility_criteria: string[] | null
          funding_type: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          location: string | null
          organization: string
          required_documents: string[] | null
          sectors: string[] | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          amount_display?: string | null
          amount_max?: number | null
          amount_min?: number | null
          application_url?: string | null
          applications_count?: number | null
          category: string
          contact_email?: string | null
          created_at?: string
          currency?: string | null
          deadline?: string | null
          description?: string | null
          eligibility_criteria?: string[] | null
          funding_type?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          location?: string | null
          organization: string
          required_documents?: string[] | null
          sectors?: string[] | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          amount_display?: string | null
          amount_max?: number | null
          amount_min?: number | null
          application_url?: string | null
          applications_count?: number | null
          category?: string
          contact_email?: string | null
          created_at?: string
          currency?: string | null
          deadline?: string | null
          description?: string | null
          eligibility_criteria?: string[] | null
          funding_type?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          location?: string | null
          organization?: string
          required_documents?: string[] | null
          sectors?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
      }
      negotiation_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          message_type: string | null
          negotiation_id: string
          proposed_price: number | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          message_type?: string | null
          negotiation_id: string
          proposed_price?: number | null
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          message_type?: string | null
          negotiation_id?: string
          proposed_price?: number | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_messages_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          client_id: string
          created_at: string
          current_price: number
          expires_at: string | null
          final_price: number | null
          id: string
          initial_price: number
          notes: string | null
          platform_fee: number | null
          provider_id: string
          service_id: string | null
          service_title: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_price: number
          expires_at?: string | null
          final_price?: number | null
          id?: string
          initial_price: number
          notes?: string | null
          platform_fee?: number | null
          provider_id: string
          service_id?: string | null
          service_title: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_price?: number
          expires_at?: string | null
          final_price?: number | null
          id?: string
          initial_price?: number
          notes?: string | null
          platform_fee?: number | null
          provider_id?: string
          service_id?: string | null
          service_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          agreed_price: number
          client_id: string
          client_rating: number | null
          client_review: string | null
          completed_at: string | null
          created_at: string
          currency: string
          delivery_deadline: string | null
          id: string
          negotiation_id: string | null
          payment_status: string | null
          platform_fee: number | null
          provider_id: string
          provider_rating: number | null
          provider_review: string | null
          service_id: string | null
          service_title: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          agreed_price: number
          client_id: string
          client_rating?: number | null
          client_review?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          delivery_deadline?: string | null
          id?: string
          negotiation_id?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          provider_id: string
          provider_rating?: number | null
          provider_review?: string | null
          service_id?: string | null
          service_title: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          agreed_price?: number
          client_id?: string
          client_rating?: number | null
          client_review?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          delivery_deadline?: string | null
          id?: string
          negotiation_id?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          provider_id?: string
          provider_rating?: number | null
          provider_review?: string | null
          service_id?: string | null
          service_title?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_negotiation_id_fkey"
            columns: ["negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          application_id: string | null
          commission_rate: number | null
          company_name: string
          contact_name: string
          created_at: string
          description: string | null
          email: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          partnership_type: string
          phone: string | null
          total_earnings: number | null
          total_referrals: number | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          application_id?: string | null
          commission_rate?: number | null
          company_name: string
          contact_name: string
          created_at?: string
          description?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          partnership_type: string
          phone?: string | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          application_id?: string | null
          commission_rate?: number | null
          company_name?: string
          contact_name?: string
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          partnership_type?: string
          phone?: string | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partnership_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_applications: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          description: string | null
          email: string
          id: string
          partnership_type: string
          phone: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string
          description?: string | null
          email: string
          id?: string
          partnership_type: string
          phone?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          partnership_type?: string
          phone?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
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
      referrals: {
        Row: {
          commission_amount: number | null
          commission_paid: boolean | null
          conversion_amount: number | null
          created_at: string
          id: string
          paid_at: string | null
          partner_id: string
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          commission_amount?: number | null
          commission_paid?: boolean | null
          conversion_amount?: number | null
          created_at?: string
          id?: string
          paid_at?: string | null
          partner_id: string
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number | null
          commission_paid?: boolean | null
          conversion_amount?: number | null
          created_at?: string
          id?: string
          paid_at?: string | null
          partner_id?: string
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          created_at: string
          id: string
          is_verified_purchase: boolean | null
          order_id: string | null
          rating: number
          response: string | null
          response_at: string | null
          review: string | null
          reviewer_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified_purchase?: boolean | null
          order_id?: string | null
          rating: number
          response?: string | null
          response_at?: string | null
          review?: string | null
          reviewer_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_verified_purchase?: boolean | null
          order_id?: string | null
          rating?: number
          response?: string | null
          response_at?: string | null
          review?: string | null
          reviewer_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string
          currency: string
          delivery_time: string | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          location: string | null
          max_price: number | null
          min_price: number | null
          orders_count: number | null
          price: number
          price_type: string | null
          provider_id: string
          provider_type: string | null
          rating: number | null
          reviews_count: number | null
          skills: string[] | null
          subcategory: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          currency?: string
          delivery_time?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          location?: string | null
          max_price?: number | null
          min_price?: number | null
          orders_count?: number | null
          price?: number
          price_type?: string | null
          provider_id: string
          provider_type?: string | null
          rating?: number | null
          reviews_count?: number | null
          skills?: string[] | null
          subcategory?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          delivery_time?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          location?: string | null
          max_price?: number | null
          min_price?: number | null
          orders_count?: number | null
          price?: number
          price_type?: string | null
          provider_id?: string
          provider_type?: string | null
          rating?: number | null
          reviews_count?: number | null
          skills?: string[] | null
          subcategory?: string | null
          title?: string
          updated_at?: string
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
