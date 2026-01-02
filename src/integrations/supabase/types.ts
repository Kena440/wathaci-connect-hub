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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
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
      freelancer_profiles: {
        Row: {
          availability: string
          certifications: string[] | null
          created_at: string
          experience_level: string
          languages: string[] | null
          past_clients: string | null
          portfolio_url: string | null
          preferred_industries: string[] | null
          primary_skills: string[]
          professional_title: string
          profile_id: string
          rate_range: string
          rate_type: string
          services_offered: string
          updated_at: string
          work_mode: string
        }
        Insert: {
          availability: string
          certifications?: string[] | null
          created_at?: string
          experience_level: string
          languages?: string[] | null
          past_clients?: string | null
          portfolio_url?: string | null
          preferred_industries?: string[] | null
          primary_skills?: string[]
          professional_title: string
          profile_id: string
          rate_range: string
          rate_type: string
          services_offered: string
          updated_at?: string
          work_mode: string
        }
        Update: {
          availability?: string
          certifications?: string[] | null
          created_at?: string
          experience_level?: string
          languages?: string[] | null
          past_clients?: string | null
          portfolio_url?: string | null
          preferred_industries?: string[] | null
          primary_skills?: string[]
          professional_title?: string
          profile_id?: string
          rate_range?: string
          rate_type?: string
          services_offered?: string
          updated_at?: string
          work_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "freelancer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelancer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      funding_matches: {
        Row: {
          action_plan: string | null
          created_at: string
          funding_id: string
          id: string
          match_score: number
          reasons: string[] | null
          sme_id: string
        }
        Insert: {
          action_plan?: string | null
          created_at?: string
          funding_id: string
          id?: string
          match_score: number
          reasons?: string[] | null
          sme_id: string
        }
        Update: {
          action_plan?: string | null
          created_at?: string
          funding_id?: string
          id?: string
          match_score?: number
          reasons?: string[] | null
          sme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funding_matches_funding_id_fkey"
            columns: ["funding_id"]
            isOneToOne: false
            referencedRelation: "funding_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_matches_sme_id_fkey"
            columns: ["sme_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_matches_sme_id_fkey"
            columns: ["sme_id"]
            isOneToOne: false
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_matches_sme_id_fkey"
            columns: ["sme_id"]
            isOneToOne: false
            referencedRelation: "v_public_profiles"
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
          confidence_score: number | null
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
          last_checked_at: string | null
          location: string | null
          organization: string
          region_focus: string[] | null
          required_documents: string[] | null
          requirements: string | null
          sectors: string[] | null
          source_url: string | null
          summary: string | null
          target_stage: string[] | null
          title: string
          type: string | null
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
          confidence_score?: number | null
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
          last_checked_at?: string | null
          location?: string | null
          organization: string
          region_focus?: string[] | null
          required_documents?: string[] | null
          requirements?: string | null
          sectors?: string[] | null
          source_url?: string | null
          summary?: string | null
          target_stage?: string[] | null
          title: string
          type?: string | null
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
          confidence_score?: number | null
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
          last_checked_at?: string | null
          location?: string | null
          organization?: string
          region_focus?: string[] | null
          required_documents?: string[] | null
          requirements?: string | null
          sectors?: string[] | null
          source_url?: string | null
          summary?: string | null
          target_stage?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
      }
      government_profiles: {
        Row: {
          collaboration_interests: string[]
          contact_person_title: string
          created_at: string
          current_initiatives: string | null
          department_or_unit: string
          documents_urls: string[] | null
          eligibility_criteria: string | null
          institution_name: string
          institution_type: string
          mandate_areas: string[]
          procurement_portal_url: string | null
          profile_id: string
          services_or_programmes: string
          updated_at: string
        }
        Insert: {
          collaboration_interests?: string[]
          contact_person_title: string
          created_at?: string
          current_initiatives?: string | null
          department_or_unit: string
          documents_urls?: string[] | null
          eligibility_criteria?: string | null
          institution_name: string
          institution_type: string
          mandate_areas?: string[]
          procurement_portal_url?: string | null
          profile_id: string
          services_or_programmes: string
          updated_at?: string
        }
        Update: {
          collaboration_interests?: string[]
          contact_person_title?: string
          created_at?: string
          current_initiatives?: string | null
          department_or_unit?: string
          documents_urls?: string[] | null
          eligibility_criteria?: string | null
          institution_name?: string
          institution_type?: string
          mandate_areas?: string[]
          procurement_portal_url?: string | null
          profile_id?: string
          services_or_programmes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "government_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "government_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_profiles: {
        Row: {
          created_at: string
          decision_timeline: string | null
          geo_focus: string[]
          investment_preferences: string[]
          investment_stage_focus: string[]
          investor_type: string
          portfolio_companies: string[] | null
          profile_id: string
          required_documents: string | null
          sectors_of_interest: string[]
          thesis: string | null
          ticket_size_range: string
          updated_at: string
          website_override: string | null
        }
        Insert: {
          created_at?: string
          decision_timeline?: string | null
          geo_focus?: string[]
          investment_preferences?: string[]
          investment_stage_focus?: string[]
          investor_type: string
          portfolio_companies?: string[] | null
          profile_id: string
          required_documents?: string | null
          sectors_of_interest?: string[]
          thesis?: string | null
          ticket_size_range: string
          updated_at?: string
          website_override?: string | null
        }
        Update: {
          created_at?: string
          decision_timeline?: string | null
          geo_focus?: string[]
          investment_preferences?: string[]
          investment_stage_focus?: string[]
          investor_type?: string
          portfolio_companies?: string[] | null
          profile_id?: string
          required_documents?: string | null
          sectors_of_interest?: string[]
          thesis?: string | null
          ticket_size_range?: string
          updated_at?: string
          website_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investor_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      needs_assessments: {
        Row: {
          ai_analysis: Json | null
          assessment_type: string
          business_type: string | null
          created_at: string
          funding_amount: number | null
          funding_purpose: string | null
          funding_timeline: string | null
          gaps_identified: string[] | null
          id: string
          location: string | null
          recommendations: Json | null
          sector: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          assessment_type: string
          business_type?: string | null
          created_at?: string
          funding_amount?: number | null
          funding_purpose?: string | null
          funding_timeline?: string | null
          gaps_identified?: string[] | null
          id?: string
          location?: string | null
          recommendations?: Json | null
          sector?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          assessment_type?: string
          business_type?: string | null
          created_at?: string
          funding_amount?: number | null
          funding_purpose?: string | null
          funding_timeline?: string | null
          gaps_identified?: string[] | null
          id?: string
          location?: string | null
          recommendations?: Json | null
          sector?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
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
      notification_logs: {
        Row: {
          created_at: string
          email_sent: boolean | null
          id: string
          message: string | null
          notification_type: string
          related_id: string | null
          sent_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_sent?: boolean | null
          id?: string
          message?: string | null
          notification_type: string
          related_id?: string | null
          sent_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_sent?: boolean | null
          id?: string
          message?: string | null
          notification_type?: string
          related_id?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          frequency: string | null
          funding_alerts: boolean | null
          match_alerts: boolean | null
          messages: boolean | null
          product_updates: boolean | null
          quiet_hours: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          frequency?: string | null
          funding_alerts?: boolean | null
          match_alerts?: boolean | null
          messages?: boolean | null
          product_updates?: boolean | null
          quiet_hours?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          frequency?: string | null
          funding_alerts?: boolean | null
          match_alerts?: boolean | null
          messages?: boolean | null
          product_updates?: boolean | null
          quiet_hours?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_public_profiles"
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
          display_name: string | null
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
          is_profile_complete: boolean
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
          display_name?: string | null
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
          is_profile_complete?: boolean
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
          display_name?: string | null
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
          is_profile_complete?: boolean
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
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          device_info: Json | null
          endpoint: string | null
          fcm_token: string | null
          id: string
          is_active: boolean | null
          p256dh: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          device_info?: Json | null
          endpoint?: string | null
          fcm_token?: string | null
          id?: string
          is_active?: boolean | null
          p256dh?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          device_info?: Json | null
          endpoint?: string | null
          fcm_token?: string | null
          id?: string
          is_active?: boolean | null
          p256dh?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pwa_analytics: {
        Row: {
          created_at: string
          device_info: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pwa_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pwa_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_public_partners"
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
      sme_professional_matches: {
        Row: {
          created_at: string
          id: string
          match_score: number
          professional_id: string
          reasons: string[] | null
          recommended_scope: string | null
          sme_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_score: number
          professional_id: string
          reasons?: string[] | null
          recommended_scope?: string | null
          sme_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_score?: number
          professional_id?: string
          reasons?: string[] | null
          recommended_scope?: string | null
          sme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sme_professional_matches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sme_professional_matches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sme_professional_matches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "v_public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sme_professional_matches_sme_id_fkey"
            columns: ["sme_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sme_professional_matches_sme_id_fkey"
            columns: ["sme_id"]
            isOneToOne: false
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sme_professional_matches_sme_id_fkey"
            columns: ["sme_id"]
            isOneToOne: false
            referencedRelation: "v_public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sme_profiles: {
        Row: {
          areas_served: string[]
          business_name: string
          business_stage: string
          created_at: string
          documents_urls: string[] | null
          funding_needed: boolean | null
          funding_range: string | null
          industry: string
          monthly_revenue_range: string | null
          preferred_support: string[] | null
          profile_id: string
          registration_number: string | null
          registration_status: string | null
          sectors_of_interest: string[] | null
          services_or_products: string
          team_size_range: string | null
          top_needs: string[]
          updated_at: string
          year_established: number | null
        }
        Insert: {
          areas_served?: string[]
          business_name: string
          business_stage: string
          created_at?: string
          documents_urls?: string[] | null
          funding_needed?: boolean | null
          funding_range?: string | null
          industry: string
          monthly_revenue_range?: string | null
          preferred_support?: string[] | null
          profile_id: string
          registration_number?: string | null
          registration_status?: string | null
          sectors_of_interest?: string[] | null
          services_or_products: string
          team_size_range?: string | null
          top_needs?: string[]
          updated_at?: string
          year_established?: number | null
        }
        Update: {
          areas_served?: string[]
          business_name?: string
          business_stage?: string
          created_at?: string
          documents_urls?: string[] | null
          funding_needed?: boolean | null
          funding_range?: string | null
          industry?: string
          monthly_revenue_range?: string | null
          preferred_support?: string[] | null
          profile_id?: string
          registration_number?: string | null
          registration_status?: string | null
          sectors_of_interest?: string[] | null
          services_or_products?: string
          team_size_range?: string | null
          top_needs?: string[]
          updated_at?: string
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sme_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sme_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_profile_match_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sme_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          idempotency_key: string | null
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
          idempotency_key?: string | null
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
          idempotency_key?: string | null
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
          created_by: string | null
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          error: string | null
          event_id: string
          event_type: string | null
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          provider: string
          received_at: string
        }
        Insert: {
          error?: string | null
          event_id: string
          event_type?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider: string
          received_at?: string
        }
        Update: {
          error?: string | null
          event_id?: string
          event_type?: string | null
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_profile_match_features: {
        Row: {
          account_type: string | null
          city: string | null
          country: string | null
          id: string | null
          match_text: string | null
          primary_tags: string[] | null
          secondary_tags: string[] | null
        }
        Relationships: []
      }
      v_public_partners: {
        Row: {
          company_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          partnership_type: string | null
          website: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          partnership_type?: string | null
          website?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          partnership_type?: string | null
          website?: string | null
        }
        Relationships: []
      }
      v_public_profiles: {
        Row: {
          account_type: string | null
          areas_served: string[] | null
          availability: string | null
          bio: string | null
          business_name: string | null
          business_stage: string | null
          certifications: string[] | null
          city: string | null
          collaboration_interests: string[] | null
          contact_person_title: string | null
          country: string | null
          created_at: string | null
          department_or_unit: string | null
          display_name: string | null
          experience_level: string | null
          freelancer_services: string | null
          full_name: string | null
          funding_needed: boolean | null
          geo_focus: string[] | null
          id: string | null
          industry: string | null
          institution_name: string | null
          institution_type: string | null
          investment_preferences: string[] | null
          investment_stage_focus: string[] | null
          investor_sectors: string[] | null
          investor_type: string | null
          is_profile_complete: boolean | null
          languages: string[] | null
          linkedin: string | null
          mandate_areas: string[] | null
          preferred_industries: string[] | null
          primary_skills: string[] | null
          professional_title: string | null
          profile_photo_url: string | null
          rate_range: string | null
          rate_type: string | null
          services_or_programmes: string | null
          sme_sectors: string[] | null
          sme_services: string | null
          team_size_range: string | null
          thesis: string | null
          ticket_size_range: string | null
          top_needs: string[] | null
          website: string | null
          work_mode: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_repair_wallet_transaction: {
        Args: {
          p_amount: number
          p_currency: string
          p_reason: string
          p_user_id: string
        }
        Returns: Json
      }
      apply_wallet_transaction: {
        Args: {
          p_amount: number
          p_currency: string
          p_description?: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_provider?: string
          p_provider_reference?: string
          p_transaction_type: string
          p_user_id: string
        }
        Returns: Json
      }
      assign_admin_role: {
        Args: {
          p_notes?: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: Json
      }
      calculate_platform_fee: {
        Args: { p_amount: number; p_currency: string }
        Returns: number
      }
      complete_profile: {
        Args: {
          p_account_type: string
          p_base_data: Json
          p_role_data: Json
          p_user_id: string
        }
        Returns: Json
      }
      get_grace_period_end: { Args: never; Returns: string }
      get_user_entitlements: { Args: { p_user_id: string }; Returns: Json }
      has_full_access: { Args: { p_user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
      revoke_admin_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_type_enum: "sme" | "freelancer" | "investor" | "government"
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
      account_type_enum: ["sme", "freelancer", "investor", "government"],
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
