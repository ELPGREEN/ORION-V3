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
      adaptive_system_prompts: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          exemplos_resposta: Json | null
          humor_modo: string | null
          id: string
          instrucao_sistema: string
          perfil_fala: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          exemplos_resposta?: Json | null
          humor_modo?: string | null
          id?: string
          instrucao_sistema?: string
          perfil_fala?: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          exemplos_resposta?: Json | null
          humor_modo?: string | null
          id?: string
          instrucao_sistema?: string
          perfil_fala?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_emails: {
        Row: {
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          created_at: string
          direction: string
          from_email: string
          from_name: string | null
          id: string
          metadata: Json | null
          parent_email_id: string | null
          read_at: string | null
          replied_at: string | null
          status: string
          subject: string | null
          tags: string[] | null
          thread_id: string | null
          to_email: string
          to_name: string | null
        }
        Insert: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          direction?: string
          from_email: string
          from_name?: string | null
          id?: string
          metadata?: Json | null
          parent_email_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          status?: string
          subject?: string | null
          tags?: string[] | null
          thread_id?: string | null
          to_email: string
          to_name?: string | null
        }
        Update: {
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          direction?: string
          from_email?: string
          from_name?: string | null
          id?: string
          metadata?: Json | null
          parent_email_id?: string | null
          read_at?: string | null
          replied_at?: string | null
          status?: string
          subject?: string | null
          tags?: string[] | null
          thread_id?: string | null
          to_email?: string
          to_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_emails_parent_email_id_fkey"
            columns: ["parent_email_id"]
            isOneToOne: false
            referencedRelation: "admin_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_user_id: string
          amount_cents: number
          created_at: string
          id: string
          order_id: string
          paid_at: string | null
          product_id: string
          status: string
        }
        Insert: {
          affiliate_user_id: string
          amount_cents?: number
          created_at?: string
          id?: string
          order_id: string
          paid_at?: string | null
          product_id: string
          status?: string
        }
        Update: {
          affiliate_user_id?: string
          amount_cents?: number
          created_at?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          product_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_user_id: string
          clicks: number
          conversions: number
          created_at: string
          hash: string
          id: string
          product_id: string
        }
        Insert: {
          affiliate_user_id: string
          clicks?: number
          conversions?: number
          created_at?: string
          hash?: string
          id?: string
          product_id: string
        }
        Update: {
          affiliate_user_id?: string
          clicks?: number
          conversions?: number
          created_at?: string
          hash?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_metrics: {
        Row: {
          coherence_score: number | null
          completeness_score: number | null
          complexity: string | null
          cost_tier: number | null
          created_at: string
          data_sources_used: string[] | null
          error_message: string | null
          factuality_score: number | null
          id: string
          neuro_dominant_modulator: string | null
          neuro_exploration_rate: number | null
          neuro_rpe: number | null
          overall_quality_score: number | null
          phase1_duration_ms: number | null
          phase2_duration_ms: number | null
          provider: string
          quality_grade: string | null
          query: string | null
          relevance_score: number | null
          response_length: number | null
          safety_score: number | null
          style_score: number | null
          success: boolean | null
          tokens_estimated: number | null
          tools_used: string[] | null
          total_duration_ms: number
          user_id: string | null
        }
        Insert: {
          coherence_score?: number | null
          completeness_score?: number | null
          complexity?: string | null
          cost_tier?: number | null
          created_at?: string
          data_sources_used?: string[] | null
          error_message?: string | null
          factuality_score?: number | null
          id?: string
          neuro_dominant_modulator?: string | null
          neuro_exploration_rate?: number | null
          neuro_rpe?: number | null
          overall_quality_score?: number | null
          phase1_duration_ms?: number | null
          phase2_duration_ms?: number | null
          provider: string
          quality_grade?: string | null
          query?: string | null
          relevance_score?: number | null
          response_length?: number | null
          safety_score?: number | null
          style_score?: number | null
          success?: boolean | null
          tokens_estimated?: number | null
          tools_used?: string[] | null
          total_duration_ms?: number
          user_id?: string | null
        }
        Update: {
          coherence_score?: number | null
          completeness_score?: number | null
          complexity?: string | null
          cost_tier?: number | null
          created_at?: string
          data_sources_used?: string[] | null
          error_message?: string | null
          factuality_score?: number | null
          id?: string
          neuro_dominant_modulator?: string | null
          neuro_exploration_rate?: number | null
          neuro_rpe?: number | null
          overall_quality_score?: number | null
          phase1_duration_ms?: number | null
          phase2_duration_ms?: number | null
          provider?: string
          quality_grade?: string | null
          query?: string | null
          relevance_score?: number | null
          response_length?: number | null
          safety_score?: number | null
          style_score?: number | null
          success?: boolean | null
          tokens_estimated?: number | null
          tools_used?: string[] | null
          total_duration_ms?: number
          user_id?: string | null
        }
        Relationships: []
      }
      ai_providers: {
        Row: {
          api_key_env: string | null
          created_at: string
          display_name: string
          fallback_to: string | null
          id: string
          is_enabled: boolean | null
          max_tokens: number | null
          model_name: string | null
          priority: number | null
          provider_name: string
          temperature: number | null
          updated_at: string
          use_for: Json | null
        }
        Insert: {
          api_key_env?: string | null
          created_at?: string
          display_name: string
          fallback_to?: string | null
          id?: string
          is_enabled?: boolean | null
          max_tokens?: number | null
          model_name?: string | null
          priority?: number | null
          provider_name: string
          temperature?: number | null
          updated_at?: string
          use_for?: Json | null
        }
        Update: {
          api_key_env?: string | null
          created_at?: string
          display_name?: string
          fallback_to?: string | null
          id?: string
          is_enabled?: boolean | null
          max_tokens?: number | null
          model_name?: string | null
          priority?: number | null
          provider_name?: string
          temperature?: number | null
          updated_at?: string
          use_for?: Json | null
        }
        Relationships: []
      }
      aml_screened_lists: {
        Row: {
          id: string
          issuer: string | null
          issuer_description: string | null
          jurisdiction: string | null
          jurisdiction_code: string | null
          list_name: string
          list_type: string | null
          matches_found: number | null
          report_id: string
          source_url: string | null
        }
        Insert: {
          id?: string
          issuer?: string | null
          issuer_description?: string | null
          jurisdiction?: string | null
          jurisdiction_code?: string | null
          list_name: string
          list_type?: string | null
          matches_found?: number | null
          report_id: string
          source_url?: string | null
        }
        Update: {
          id?: string
          issuer?: string | null
          issuer_description?: string | null
          jurisdiction?: string | null
          jurisdiction_code?: string | null
          list_name?: string
          list_type?: string | null
          matches_found?: number | null
          report_id?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aml_screened_lists_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "aml_screening_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_screening_history: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          report_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          report_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          report_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aml_screening_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "aml_screening_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_screening_matches: {
        Row: {
          address: string | null
          alias: string[] | null
          associated_companies: Json | null
          created_at: string
          date_of_birth: string | null
          delisting_date: string | null
          disclosure_date: string | null
          end_date: string | null
          entity_type: string | null
          gender: string | null
          id: string
          id_number: string | null
          match_rank: number | null
          match_rate: number
          matched_name: string
          matched_name_local: string | null
          nationality: string | null
          place_of_birth: string | null
          reason: string | null
          remark: string | null
          report_id: string
          review_notes: string | null
          review_status: Database["public"]["Enums"]["match_status"] | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_description: string | null
          source_issuer: string | null
          source_jurisdiction: string | null
          source_name: string
          source_url: string | null
          start_date: string | null
          tag: string | null
        }
        Insert: {
          address?: string | null
          alias?: string[] | null
          associated_companies?: Json | null
          created_at?: string
          date_of_birth?: string | null
          delisting_date?: string | null
          disclosure_date?: string | null
          end_date?: string | null
          entity_type?: string | null
          gender?: string | null
          id?: string
          id_number?: string | null
          match_rank?: number | null
          match_rate: number
          matched_name: string
          matched_name_local?: string | null
          nationality?: string | null
          place_of_birth?: string | null
          reason?: string | null
          remark?: string | null
          report_id: string
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["match_status"] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_description?: string | null
          source_issuer?: string | null
          source_jurisdiction?: string | null
          source_name: string
          source_url?: string | null
          start_date?: string | null
          tag?: string | null
        }
        Update: {
          address?: string | null
          alias?: string[] | null
          associated_companies?: Json | null
          created_at?: string
          date_of_birth?: string | null
          delisting_date?: string | null
          disclosure_date?: string | null
          end_date?: string | null
          entity_type?: string | null
          gender?: string | null
          id?: string
          id_number?: string | null
          match_rank?: number | null
          match_rate?: number
          matched_name?: string
          matched_name_local?: string | null
          nationality?: string | null
          place_of_birth?: string | null
          reason?: string | null
          remark?: string | null
          report_id?: string
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["match_status"] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_description?: string | null
          source_issuer?: string | null
          source_jurisdiction?: string | null
          source_name?: string
          source_url?: string | null
          start_date?: string | null
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aml_screening_matches_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "aml_screening_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      aml_screening_reports: {
        Row: {
          browser_fingerprint: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          jurisdictions: string[]
          match_rate_threshold: number
          pdf_url: string | null
          report_markdown: string | null
          report_token: string | null
          risk_level: string | null
          screening_types: string[]
          status: string | null
          subject_company_name: string | null
          subject_company_registration: string | null
          subject_country: string | null
          subject_date_of_birth: string | null
          subject_gender: string | null
          subject_id_number: string | null
          subject_name: string
          subject_name_local: string | null
          total_matches: number | null
          total_screened_lists: number | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          browser_fingerprint?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          jurisdictions?: string[]
          match_rate_threshold?: number
          pdf_url?: string | null
          report_markdown?: string | null
          report_token?: string | null
          risk_level?: string | null
          screening_types?: string[]
          status?: string | null
          subject_company_name?: string | null
          subject_company_registration?: string | null
          subject_country?: string | null
          subject_date_of_birth?: string | null
          subject_gender?: string | null
          subject_id_number?: string | null
          subject_name: string
          subject_name_local?: string | null
          total_matches?: number | null
          total_screened_lists?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          browser_fingerprint?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          jurisdictions?: string[]
          match_rate_threshold?: number
          pdf_url?: string | null
          report_markdown?: string | null
          report_token?: string | null
          risk_level?: string | null
          screening_types?: string[]
          status?: string | null
          subject_company_name?: string | null
          subject_company_registration?: string | null
          subject_country?: string | null
          subject_date_of_birth?: string | null
          subject_gender?: string | null
          subject_id_number?: string | null
          subject_name?: string
          subject_name_local?: string | null
          total_matches?: number | null
          total_screened_lists?: number | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      analises: {
        Row: {
          complemento_gemini: string | null
          created_at: string
          error_message: string | null
          id: string
          insights_claude: string | null
          modo_rapido: boolean | null
          relatorio_markdown: string | null
          status: string | null
          urls: Json
          user_id: string | null
        }
        Insert: {
          complemento_gemini?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          insights_claude?: string | null
          modo_rapido?: boolean | null
          relatorio_markdown?: string | null
          status?: string | null
          urls?: Json
          user_id?: string | null
        }
        Update: {
          complemento_gemini?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          insights_claude?: string | null
          modo_rapido?: boolean | null
          relatorio_markdown?: string | null
          status?: string | null
          urls?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      andamentos: {
        Row: {
          attachment_file_name: string | null
          attachment_storage_path: string | null
          created_at: string
          data_ocorrencia: string
          descricao: string
          id: string
          processo_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          attachment_file_name?: string | null
          attachment_storage_path?: string | null
          created_at?: string
          data_ocorrencia?: string
          descricao: string
          id?: string
          processo_id: string
          tipo?: string
          user_id: string
        }
        Update: {
          attachment_file_name?: string | null
          attachment_storage_path?: string | null
          created_at?: string
          data_ocorrencia?: string
          descricao?: string
          id?: string
          processo_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "andamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      api_cache: {
        Row: {
          created_at: string
          expires_at: string
          hit_count: number
          id: string
          last_hit_at: string | null
          query_hash: string
          query_text: string
          response_data: Json
          result_count: number
          source: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          query_hash?: string
          query_text?: string
          response_data?: Json
          result_count?: number
          source?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          query_hash?: string
          query_text?: string
          response_data?: Json
          result_count?: number
          source?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          category: string | null
          content_en: string
          content_es: string
          content_it: string
          content_pt: string
          content_zh: string
          created_at: string
          excerpt_en: string
          excerpt_es: string
          excerpt_it: string
          excerpt_pt: string
          excerpt_zh: string
          id: string
          image_url: string | null
          is_published: boolean | null
          published_at: string | null
          slug: string
          title_en: string
          title_es: string
          title_it: string
          title_pt: string
          title_zh: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content_en: string
          content_es: string
          content_it?: string
          content_pt: string
          content_zh: string
          created_at?: string
          excerpt_en: string
          excerpt_es: string
          excerpt_it?: string
          excerpt_pt: string
          excerpt_zh: string
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          title_en: string
          title_es: string
          title_it?: string
          title_pt: string
          title_zh: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content_en?: string
          content_es?: string
          content_it?: string
          content_pt?: string
          content_zh?: string
          created_at?: string
          excerpt_en?: string
          excerpt_es?: string
          excerpt_it?: string
          excerpt_pt?: string
          excerpt_zh?: string
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          title_en?: string
          title_es?: string
          title_it?: string
          title_pt?: string
          title_zh?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          aprovado: boolean
          comentario: string | null
          created_at: string
          depoimento: string | null
          foto_url: string | null
          id: string
          nome: string | null
          nota: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aprovado?: boolean
          comentario?: string | null
          created_at?: string
          depoimento?: string | null
          foto_url?: string | null
          id?: string
          nome?: string | null
          nota: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aprovado?: boolean
          comentario?: string | null
          created_at?: string
          depoimento?: string | null
          foto_url?: string | null
          id?: string
          nome?: string | null
          nota?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      barcode_cache: {
        Row: {
          barcode: string
          created_at: string
          data: Json
          expires_at: string
          hit_count: number | null
          id: string
        }
        Insert: {
          barcode: string
          created_at?: string
          data: Json
          expires_at?: string
          hit_count?: number | null
          id?: string
        }
        Update: {
          barcode?: string
          created_at?: string
          data?: Json
          expires_at?: string
          hit_count?: number | null
          id?: string
        }
        Relationships: []
      }
      bloom_shares: {
        Row: {
          bloom_id: string
          created_at: string | null
          id: string
          permission: string | null
          shared_by: string
          shared_with: string
        }
        Insert: {
          bloom_id: string
          created_at?: string | null
          id?: string
          permission?: string | null
          shared_by: string
          shared_with: string
        }
        Update: {
          bloom_id?: string
          created_at?: string | null
          id?: string
          permission?: string | null
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloom_shares_bloom_id_fkey"
            columns: ["bloom_id"]
            isOneToOne: false
            referencedRelation: "blooms"
            referencedColumns: ["id"]
          },
        ]
      }
      blooms: {
        Row: {
          ai_generated: boolean | null
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          parent_id: string | null
          position_x: number | null
          position_y: number | null
          root_id: string | null
          title: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_generated?: boolean | null
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          position_x?: number | null
          position_y?: number | null
          root_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_generated?: boolean | null
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          position_x?: number | null
          position_y?: number | null
          root_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blooms_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blooms_root_id_fkey"
            columns: ["root_id"]
            isOneToOne: false
            referencedRelation: "blooms"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_dados_senado: {
        Row: {
          cod_orgao_responsavel: number | null
          created_at: string
          des_conjunto_dados: string | null
          des_dicionario_dados: string | null
          des_frequencia_atualizacao: string | null
          des_grupo_dados: string | null
          des_tipo_campo: string | null
          dth_ultima_atualizacao: string | null
          id: string
          nom_categoria: string
          nom_conjunto_dados: string | null
          nom_dicionario_dados: string | null
          nom_orgao_responsavel: string | null
          nom_sub_categoria: string | null
          num_ordem: number | null
          txt_url: string | null
        }
        Insert: {
          cod_orgao_responsavel?: number | null
          created_at?: string
          des_conjunto_dados?: string | null
          des_dicionario_dados?: string | null
          des_frequencia_atualizacao?: string | null
          des_grupo_dados?: string | null
          des_tipo_campo?: string | null
          dth_ultima_atualizacao?: string | null
          id?: string
          nom_categoria?: string
          nom_conjunto_dados?: string | null
          nom_dicionario_dados?: string | null
          nom_orgao_responsavel?: string | null
          nom_sub_categoria?: string | null
          num_ordem?: number | null
          txt_url?: string | null
        }
        Update: {
          cod_orgao_responsavel?: number | null
          created_at?: string
          des_conjunto_dados?: string | null
          des_dicionario_dados?: string | null
          des_frequencia_atualizacao?: string | null
          des_grupo_dados?: string | null
          des_tipo_campo?: string | null
          dth_ultima_atualizacao?: string | null
          id?: string
          nom_categoria?: string
          nom_conjunto_dados?: string | null
          nom_dicionario_dados?: string | null
          nom_orgao_responsavel?: string | null
          nom_sub_categoria?: string | null
          num_ordem?: number | null
          txt_url?: string | null
        }
        Relationships: []
      }
      cgu_sanctions_cache: {
        Row: {
          cpf_cnpj: string
          created_at: string
          data_fim_sancao: string | null
          data_inicio_sancao: string | null
          data_publicacao_sancao: string | null
          descricao_fundamentacao: string | null
          expires_at: string
          fonte_sancao: string | null
          fundamentacao_legal: string | null
          hit_count: number | null
          id: string
          is_active: boolean | null
          nome_fantasia: string | null
          nome_razao_social: string
          numero_processo: string | null
          orgao_sancionador: string | null
          tipo_pessoa: string
          tipo_sancao: string
          uf_orgao_sancionador: string | null
          updated_at: string
        }
        Insert: {
          cpf_cnpj: string
          created_at?: string
          data_fim_sancao?: string | null
          data_inicio_sancao?: string | null
          data_publicacao_sancao?: string | null
          descricao_fundamentacao?: string | null
          expires_at?: string
          fonte_sancao?: string | null
          fundamentacao_legal?: string | null
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          nome_fantasia?: string | null
          nome_razao_social: string
          numero_processo?: string | null
          orgao_sancionador?: string | null
          tipo_pessoa: string
          tipo_sancao: string
          uf_orgao_sancionador?: string | null
          updated_at?: string
        }
        Update: {
          cpf_cnpj?: string
          created_at?: string
          data_fim_sancao?: string | null
          data_inicio_sancao?: string | null
          data_publicacao_sancao?: string | null
          descricao_fundamentacao?: string | null
          expires_at?: string
          fonte_sancao?: string | null
          fundamentacao_legal?: string | null
          hit_count?: number | null
          id?: string
          is_active?: boolean | null
          nome_fantasia?: string | null
          nome_razao_social?: string
          numero_processo?: string | null
          orgao_sancionador?: string | null
          tipo_pessoa?: string
          tipo_sancao?: string
          uf_orgao_sancionador?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          advogado_id: string | null
          cliente_id: string
          created_at: string
          id: string
          ultima_mensagem: string | null
          updated_at: string
        }
        Insert: {
          advogado_id?: string | null
          cliente_id: string
          created_at?: string
          id?: string
          ultima_mensagem?: string | null
          updated_at?: string
        }
        Update: {
          advogado_id?: string | null
          cliente_id?: string
          created_at?: string
          id?: string
          ultima_mensagem?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_ia_conversations: {
        Row: {
          created_at: string
          id: string
          titulo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          titulo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          titulo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_ia_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          intent: string | null
          intent_params: Json | null
          neural_enhanced: boolean
          provider: string | null
          role: string
          sources: Json | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          intent?: string | null
          intent_params?: Json | null
          neural_enhanced?: boolean
          provider?: string | null
          role?: string
          sources?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          intent?: string | null
          intent_params?: Json | null
          neural_enhanced?: boolean
          provider?: string | null
          role?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_ia_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_ia_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
          sender_role: string | null
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
          sender_role?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      citation_sources: {
        Row: {
          api_url: string | null
          base_url: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          jurisdiction: string
          metadata: Json | null
          name: string
          reliability_score: number
          source_type: Database["public"]["Enums"]["citation_type"]
          updated_at: string
        }
        Insert: {
          api_url?: string | null
          base_url: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          jurisdiction?: string
          metadata?: Json | null
          name: string
          reliability_score?: number
          source_type?: Database["public"]["Enums"]["citation_type"]
          updated_at?: string
        }
        Update: {
          api_url?: string | null
          base_url?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          jurisdiction?: string
          metadata?: Json | null
          name?: string
          reliability_score?: number
          source_type?: Database["public"]["Enums"]["citation_type"]
          updated_at?: string
        }
        Relationships: []
      }
      citation_verifications: {
        Row: {
          citation_id: string
          content_matches: boolean | null
          error_message: string | null
          id: string
          response_hash: string | null
          response_status: number | null
          url_accessible: boolean | null
          validity_confirmed: boolean | null
          verification_details: Json | null
          verification_type: string
          verified_at: string
        }
        Insert: {
          citation_id: string
          content_matches?: boolean | null
          error_message?: string | null
          id?: string
          response_hash?: string | null
          response_status?: number | null
          url_accessible?: boolean | null
          validity_confirmed?: boolean | null
          verification_details?: Json | null
          verification_type?: string
          verified_at?: string
        }
        Update: {
          citation_id?: string
          content_matches?: boolean | null
          error_message?: string | null
          id?: string
          response_hash?: string | null
          response_status?: number | null
          url_accessible?: boolean | null
          validity_confirmed?: boolean | null
          verification_details?: Json | null
          verification_type?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "citation_verifications_citation_id_fkey"
            columns: ["citation_id"]
            isOneToOne: false
            referencedRelation: "legal_citations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          categoria: string | null
          client_profile_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          notas: string | null
          storage_path: string
        }
        Insert: {
          categoria?: string | null
          client_profile_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notas?: string | null
          storage_path: string
        }
        Update: {
          categoria?: string | null
          client_profile_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notas?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          advogado_id: string | null
          cpf: string | null
          created_at: string
          descricao_problema: string | null
          email: string
          id: string
          nome: string
          status: string
          telefone: string | null
          tipo_caso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advogado_id?: string | null
          cpf?: string | null
          created_at?: string
          descricao_problema?: string | null
          email: string
          id?: string
          nome: string
          status?: string
          telefone?: string | null
          tipo_caso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advogado_id?: string | null
          cpf?: string | null
          created_at?: string
          descricao_problema?: string | null
          email?: string
          id?: string
          nome?: string
          status?: string
          telefone?: string | null
          tipo_caso?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cnpj_cache: {
        Row: {
          bairro: string | null
          capital_social: number | null
          cep: string | null
          cnae_fiscal: number | null
          cnae_fiscal_descricao: string | null
          cnaes_secundarios: Json | null
          cnpj: string
          complemento: string | null
          created_at: string
          data_inicio_atividade: string | null
          data_situacao_cadastral: string | null
          ddd_telefone_1: string | null
          ddd_telefone_2: string | null
          descricao_situacao_cadastral: string | null
          email: string | null
          expires_at: string
          hit_count: number | null
          id: string
          last_accessed_at: string | null
          logradouro: string | null
          municipio: string | null
          natureza_juridica: string | null
          nome_fantasia: string | null
          numero: string | null
          porte: string | null
          qsa: Json | null
          razao_social: string
          situacao_cadastral: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_fiscal?: number | null
          cnae_fiscal_descricao?: string | null
          cnaes_secundarios?: Json | null
          cnpj: string
          complemento?: string | null
          created_at?: string
          data_inicio_atividade?: string | null
          data_situacao_cadastral?: string | null
          ddd_telefone_1?: string | null
          ddd_telefone_2?: string | null
          descricao_situacao_cadastral?: string | null
          email?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          logradouro?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          porte?: string | null
          qsa?: Json | null
          razao_social: string
          situacao_cadastral?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          capital_social?: number | null
          cep?: string | null
          cnae_fiscal?: number | null
          cnae_fiscal_descricao?: string | null
          cnaes_secundarios?: Json | null
          cnpj?: string
          complemento?: string | null
          created_at?: string
          data_inicio_atividade?: string | null
          data_situacao_cadastral?: string | null
          ddd_telefone_1?: string | null
          ddd_telefone_2?: string | null
          descricao_situacao_cadastral?: string | null
          email?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          logradouro?: string | null
          municipio?: string | null
          natureza_juridica?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          porte?: string | null
          qsa?: Json | null
          razao_social?: string
          situacao_cadastral?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      code_snippets: {
        Row: {
          category: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          language: string
          tags: string[] | null
          title: string
          updated_at: string
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          language?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          language?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      company_intelligence: {
        Row: {
          ai_insights: string | null
          analysis_count: number | null
          collected_data: string | null
          collected_urls: Json | null
          company_name: string
          company_name_normalized: string
          contact_info: Json | null
          country: string | null
          created_at: string
          created_by: string | null
          financial_data: Json | null
          id: string
          industry: string | null
          last_analyzed_at: string | null
          leadership_data: Json | null
          products_services: Json | null
          social_links: Json | null
          updated_at: string
        }
        Insert: {
          ai_insights?: string | null
          analysis_count?: number | null
          collected_data?: string | null
          collected_urls?: Json | null
          company_name: string
          company_name_normalized: string
          contact_info?: Json | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          financial_data?: Json | null
          id?: string
          industry?: string | null
          last_analyzed_at?: string | null
          leadership_data?: Json | null
          products_services?: Json | null
          social_links?: Json | null
          updated_at?: string
        }
        Update: {
          ai_insights?: string | null
          analysis_count?: number | null
          collected_data?: string | null
          collected_urls?: Json | null
          company_name?: string
          company_name_normalized?: string
          contact_info?: Json | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          financial_data?: Json | null
          id?: string
          industry?: string | null
          last_analyzed_at?: string | null
          leadership_data?: Json | null
          products_services?: Json | null
          social_links?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      consultas: {
        Row: {
          advogado_id: string | null
          cliente_id: string
          created_at: string
          data_hora: string
          id: string
          notas: string | null
          payment_id: string | null
          payment_status: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          advogado_id?: string | null
          cliente_id: string
          created_at?: string
          data_hora: string
          id?: string
          notas?: string | null
          payment_id?: string | null
          payment_status?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          advogado_id?: string | null
          cliente_id?: string
          created_at?: string
          data_hora?: string
          id?: string
          notas?: string | null
          payment_id?: string | null
          payment_status?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      contact_documents: {
        Row: {
          contact_id: string
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          assigned_to: string | null
          channel: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          latitude: number | null
          lead_level: string | null
          longitude: number | null
          message: string
          name: string
          next_action: string | null
          next_action_date: string | null
          priority: string | null
          status: string | null
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          channel?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          latitude?: number | null
          lead_level?: string | null
          longitude?: number | null
          message: string
          name: string
          next_action?: string | null
          next_action_date?: string | null
          priority?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          channel?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          latitude?: number | null
          lead_level?: string | null
          longitude?: number | null
          message?: string
          name?: string
          next_action?: string | null
          next_action_date?: string | null
          priority?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      courtlistener_webhook_events: {
        Row: {
          created_at: string | null
          event_type: string
          event_type_label: string | null
          id: string
          payload: Json | null
          processed: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string
          event_type_label?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          event_type_label?: string | null
          id?: string
          payload?: Json | null
          processed?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      cpf_cache: {
        Row: {
          cpf: string
          created_at: string
          data_inscricao: string | null
          data_nascimento: string | null
          digito_verificador: string | null
          expires_at: string
          hit_count: number | null
          id: string
          is_valid: boolean | null
          last_accessed_at: string | null
          nome: string | null
          situacao_cadastral: string | null
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          data_inscricao?: string | null
          data_nascimento?: string | null
          digito_verificador?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          is_valid?: boolean | null
          last_accessed_at?: string | null
          nome?: string | null
          situacao_cadastral?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          data_inscricao?: string | null
          data_nascimento?: string | null
          digito_verificador?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          is_valid?: boolean | null
          last_accessed_at?: string | null
          nome?: string | null
          situacao_cadastral?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          closed_at: string | null
          counterparty: string | null
          country: string | null
          created_at: string | null
          creator_id: string
          id: string
          notes: string | null
          probability: number | null
          sent_at: string | null
          status: string
          title: string | null
          type: string
          updated_at: string | null
          value_cents: number | null
        }
        Insert: {
          closed_at?: string | null
          counterparty?: string | null
          country?: string | null
          created_at?: string | null
          creator_id: string
          id?: string
          notes?: string | null
          probability?: number | null
          sent_at?: string | null
          status?: string
          title?: string | null
          type: string
          updated_at?: string | null
          value_cents?: number | null
        }
        Update: {
          closed_at?: string | null
          counterparty?: string | null
          country?: string | null
          created_at?: string | null
          creator_id?: string
          id?: string
          notes?: string | null
          probability?: number | null
          sent_at?: string | null
          status?: string
          title?: string | null
          type?: string
          updated_at?: string | null
          value_cents?: number | null
        }
        Relationships: []
      }
      document_drafts: {
        Row: {
          content: string | null
          created_at: string | null
          document_id: string | null
          draft_key: string | null
          edited_content: string | null
          form_data: Json | null
          id: string
          step: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          document_id?: string | null
          draft_key?: string | null
          edited_content?: string | null
          form_data?: Json | null
          id?: string
          step?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          document_id?: string | null
          draft_key?: string | null
          edited_content?: string | null
          form_data?: Json | null
          id?: string
          step?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_drafts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          client_profile_id: string | null
          color: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_profile_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_profile_id?: string | null
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_locks: {
        Row: {
          document_id: string
          expires_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          locked_by_name: string | null
          user_id: string
        }
        Insert: {
          document_id: string
          expires_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          locked_by_name?: string | null
          user_id: string
        }
        Update: {
          document_id?: string
          expires_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          locked_by_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_locks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_style_memory: {
        Row: {
          created_at: string | null
          document_type: string
          font_family: string | null
          font_size: string | null
          id: string
          line_height: string | null
          margin_bottom: string | null
          margin_top: string | null
          sample_count: number | null
          style_fingerprint: Json | null
          style_preferences: Json | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_type: string
          font_family?: string | null
          font_size?: string | null
          id?: string
          line_height?: string | null
          margin_bottom?: string | null
          margin_top?: string | null
          sample_count?: number | null
          style_fingerprint?: Json | null
          style_preferences?: Json | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_type?: string
          font_family?: string | null
          font_size?: string | null
          id?: string
          line_height?: string | null
          margin_bottom?: string | null
          margin_top?: string | null
          sample_count?: number | null
          style_fingerprint?: Json | null
          style_preferences?: Json | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          content_en: string
          content_es: string
          content_it: string
          content_pt: string
          content_zh: string
          created_at: string
          created_by: string | null
          fields: Json | null
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          content_en: string
          content_es: string
          content_it: string
          content_pt: string
          content_zh: string
          created_at?: string
          created_by?: string | null
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          content_en?: string
          content_es?: string
          content_it?: string
          content_pt?: string
          content_zh?: string
          created_at?: string
          created_by?: string | null
          fields?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_validation_cache: {
        Row: {
          alignment_score: number | null
          consistency_score: number | null
          content_hash: string
          correction_attempts: number | null
          created_at: string
          document_id: string
          formatting_score: number | null
          id: string
          is_fully_valid: boolean | null
          manual_review_notes: string[] | null
          pdf_released: boolean | null
          requires_manual_review: boolean | null
          validated_at: string
        }
        Insert: {
          alignment_score?: number | null
          consistency_score?: number | null
          content_hash: string
          correction_attempts?: number | null
          created_at?: string
          document_id: string
          formatting_score?: number | null
          id?: string
          is_fully_valid?: boolean | null
          manual_review_notes?: string[] | null
          pdf_released?: boolean | null
          requires_manual_review?: boolean | null
          validated_at?: string
        }
        Update: {
          alignment_score?: number | null
          consistency_score?: number | null
          content_hash?: string
          correction_attempts?: number | null
          created_at?: string
          document_id?: string
          formatting_score?: number | null
          id?: string
          is_fully_valid?: boolean | null
          manual_review_notes?: string[] | null
          pdf_released?: boolean | null
          requires_manual_review?: boolean | null
          validated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_validation_cache_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_validations: {
        Row: {
          alignment_issues: Json | null
          alignment_score: number | null
          consistency_issues: Json | null
          consistency_score: number | null
          created_at: string | null
          document_id: string | null
          formatting_issues: Json | null
          formatting_score: number | null
          id: string
          is_valid: boolean | null
          processing_time_ms: number | null
          user_id: string
          validation_status: string | null
        }
        Insert: {
          alignment_issues?: Json | null
          alignment_score?: number | null
          consistency_issues?: Json | null
          consistency_score?: number | null
          created_at?: string | null
          document_id?: string | null
          formatting_issues?: Json | null
          formatting_score?: number | null
          id?: string
          is_valid?: boolean | null
          processing_time_ms?: number | null
          user_id: string
          validation_status?: string | null
        }
        Update: {
          alignment_issues?: Json | null
          alignment_score?: number | null
          consistency_issues?: Json | null
          consistency_score?: number | null
          created_at?: string | null
          document_id?: string | null
          formatting_issues?: Json | null
          formatting_score?: number | null
          id?: string
          is_valid?: boolean | null
          processing_time_ms?: number | null
          user_id?: string
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_validations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          content: string
          created_at: string
          document_id: string
          id: string
          title: string | null
          user_id: string
          version_label: string | null
          word_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          id?: string
          title?: string | null
          user_id: string
          version_label?: string | null
          word_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          title?: string | null
          user_id?: string
          version_label?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_number: string | null
          content: string | null
          created_at: string
          document_type: string | null
          file_name: string | null
          folder_id: string | null
          id: string
          metadata: Json | null
          parties_author: string | null
          parties_defendant: string | null
          pdf_url: string | null
          signature_status: string | null
          status: string | null
          storage_path: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          watermark: string | null
        }
        Insert: {
          case_number?: string | null
          content?: string | null
          created_at?: string
          document_type?: string | null
          file_name?: string | null
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          parties_author?: string | null
          parties_defendant?: string | null
          pdf_url?: string | null
          signature_status?: string | null
          status?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          watermark?: string | null
        }
        Update: {
          case_number?: string | null
          content?: string | null
          created_at?: string
          document_type?: string | null
          file_name?: string | null
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          parties_author?: string | null
          parties_defendant?: string | null
          pdf_url?: string | null
          signature_status?: string | null
          status?: string | null
          storage_path?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          watermark?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      elp_batch_queue: {
        Row: {
          action: string
          batch_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json
          priority: number | null
          result: Json | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          batch_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload: Json
          priority?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          batch_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          priority?: number | null
          result?: Json | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      elp_response_cache: {
        Row: {
          action: string
          cache_key: string
          created_at: string | null
          expires_at: string | null
          hit_count: number | null
          id: string
          last_accessed_at: string | null
          model: string | null
          processing_ms: number | null
          request_hash: string
          response_data: Json
          tokens_used: number | null
        }
        Insert: {
          action: string
          cache_key: string
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          model?: string | null
          processing_ms?: number | null
          request_hash: string
          response_data: Json
          tokens_used?: number | null
        }
        Update: {
          action?: string
          cache_key?: string
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          last_accessed_at?: string | null
          model?: string | null
          processing_ms?: number | null
          request_hash?: string
          response_data?: Json
          tokens_used?: number | null
        }
        Relationships: []
      }
      email_signature_settings: {
        Row: {
          company_email: string | null
          company_locations: string | null
          company_name: string | null
          company_phone: string | null
          company_slogan: string | null
          company_website: string | null
          created_at: string
          id: string
          include_social_links: boolean | null
          linkedin_url: string | null
          sender_name: string | null
          sender_phone: string | null
          sender_photo_url: string | null
          sender_position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_email?: string | null
          company_locations?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_slogan?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          include_social_links?: boolean | null
          linkedin_url?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          sender_photo_url?: string | null
          sender_position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_email?: string | null
          company_locations?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_slogan?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          include_social_links?: boolean | null
          linkedin_url?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          sender_photo_url?: string | null
          sender_position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_en: string
          body_es: string
          body_it: string
          body_pt: string
          body_zh: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          subject_en: string
          subject_es: string
          subject_it: string
          subject_pt: string
          subject_zh: string
          updated_at: string
        }
        Insert: {
          body_en: string
          body_es: string
          body_it: string
          body_pt: string
          body_zh: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject_en: string
          subject_es: string
          subject_it: string
          subject_pt: string
          subject_zh: string
          updated_at?: string
        }
        Update: {
          body_en?: string
          body_es?: string
          body_it?: string
          body_pt?: string
          body_zh?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject_en?: string
          subject_es?: string
          subject_it?: string
          subject_pt?: string
          subject_zh?: string
          updated_at?: string
        }
        Relationships: []
      }
      environmental_context: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          confianca: number | null
          contexto_adicional: string | null
          created_at: string | null
          emocao_detectada: string | null
          id: string
          objeto_detectado: string
          posicao_relativa: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          confianca?: number | null
          contexto_adicional?: string | null
          created_at?: string | null
          emocao_detectada?: string | null
          id?: string
          objeto_detectado?: string
          posicao_relativa?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          confianca?: number | null
          contexto_adicional?: string | null
          created_at?: string | null
          emocao_detectada?: string | null
          id?: string
          objeto_detectado?: string
          posicao_relativa?: string | null
          user_id?: string
        }
        Relationships: []
      }
      escritorio_config: {
        Row: {
          areas_atuacao: string[] | null
          banner_url: string | null
          bio: string | null
          created_at: string | null
          email_assinatura_texto: string | null
          email_contato: string | null
          email_cor_fundo: string | null
          email_cor_primaria: string | null
          email_remetente_nome: string | null
          email_rodape_texto: string | null
          endereco: string | null
          experiencia_anos: number | null
          frase_impacto: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          meta_description: string | null
          nome_escritorio: string
          oab: string | null
          site_ativo: boolean | null
          telefone: string | null
          timbre_contatos: string | null
          timbre_endereco: string | null
          timbre_url: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          areas_atuacao?: string[] | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          email_assinatura_texto?: string | null
          email_contato?: string | null
          email_cor_fundo?: string | null
          email_cor_primaria?: string | null
          email_remetente_nome?: string | null
          email_rodape_texto?: string | null
          endereco?: string | null
          experiencia_anos?: number | null
          frase_impacto?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          meta_description?: string | null
          nome_escritorio?: string
          oab?: string | null
          site_ativo?: boolean | null
          telefone?: string | null
          timbre_contatos?: string | null
          timbre_endereco?: string | null
          timbre_url?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          areas_atuacao?: string[] | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          email_assinatura_texto?: string | null
          email_contato?: string | null
          email_cor_fundo?: string | null
          email_cor_primaria?: string | null
          email_remetente_nome?: string | null
          email_rodape_texto?: string | null
          endereco?: string | null
          experiencia_anos?: number | null
          frase_impacto?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          meta_description?: string | null
          nome_escritorio?: string
          oab?: string | null
          site_ativo?: boolean | null
          telefone?: string | null
          timbre_contatos?: string | null
          timbre_endereco?: string | null
          timbre_url?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      execution_plans: {
        Row: {
          actual_ms: number | null
          completed_at: string | null
          completed_nodes: number | null
          created_at: string
          critical_path: string[] | null
          estimated_ms: number | null
          failed_nodes: number | null
          goal: string
          id: string
          metadata: Json | null
          parallelism: number | null
          plan_id: string
          status: string | null
          total_nodes: number | null
        }
        Insert: {
          actual_ms?: number | null
          completed_at?: string | null
          completed_nodes?: number | null
          created_at?: string
          critical_path?: string[] | null
          estimated_ms?: number | null
          failed_nodes?: number | null
          goal: string
          id?: string
          metadata?: Json | null
          parallelism?: number | null
          plan_id: string
          status?: string | null
          total_nodes?: number | null
        }
        Update: {
          actual_ms?: number | null
          completed_at?: string | null
          completed_nodes?: number | null
          created_at?: string
          critical_path?: string[] | null
          estimated_ms?: number | null
          failed_nodes?: number | null
          goal?: string
          id?: string
          metadata?: Json | null
          parallelism?: number | null
          plan_id?: string
          status?: string | null
          total_nodes?: number | null
        }
        Relationships: []
      }
      face_auth_enrollments: {
        Row: {
          anti_spoof_config: Json
          created_at: string
          enrollment_quality: number
          face_embedding_data: Json
          failed_attempts: number
          id: string
          is_active: boolean
          last_verified_at: string | null
          locked_until: string | null
          reference_images: string[]
          updated_at: string
          user_id: string
          verification_count: number
        }
        Insert: {
          anti_spoof_config?: Json
          created_at?: string
          enrollment_quality?: number
          face_embedding_data?: Json
          failed_attempts?: number
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          locked_until?: string | null
          reference_images?: string[]
          updated_at?: string
          user_id: string
          verification_count?: number
        }
        Update: {
          anti_spoof_config?: Json
          created_at?: string
          enrollment_quality?: number
          face_embedding_data?: Json
          failed_attempts?: number
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          locked_until?: string | null
          reference_images?: string[]
          updated_at?: string
          user_id?: string
          verification_count?: number
        }
        Relationships: []
      }
      face_auth_log: {
        Row: {
          action: string
          confidence: number | null
          created_at: string
          device_info: Json | null
          id: string
          ip_hint: string | null
          user_id: string | null
        }
        Insert: {
          action?: string
          confidence?: number | null
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_hint?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          confidence?: number | null
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_hint?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      face_templates: {
        Row: {
          created_at: string
          descriptor: Json
          device_info: Json | null
          id: string
          is_active: boolean | null
          lgpd_consent_at: string
          quality_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descriptor: Json
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          lgpd_consent_at: string
          quality_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descriptor?: Json
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          lgpd_consent_at?: string
          quality_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feasibility_market_data: {
        Row: {
          country: string | null
          demand_tons_year: number | null
          growth_rate_pct: number | null
          id: string
          material_type: string
          price_per_ton_usd: number
          region: string
          regulatory_notes: string | null
          source: string | null
          supply_gap_pct: number | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          demand_tons_year?: number | null
          growth_rate_pct?: number | null
          id?: string
          material_type: string
          price_per_ton_usd?: number
          region: string
          regulatory_notes?: string | null
          source?: string | null
          supply_gap_pct?: number | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          demand_tons_year?: number | null
          growth_rate_pct?: number | null
          id?: string
          material_type?: string
          price_per_ton_usd?: number
          region?: string
          regulatory_notes?: string | null
          source?: string | null
          supply_gap_pct?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      feasibility_studies: {
        Row: {
          administrative_cost: number | null
          annual_ebitda: number | null
          annual_opex: number | null
          annual_revenue: number | null
          collection_model: string | null
          country: string | null
          created_at: string
          created_by: string | null
          daily_capacity_tons: number | null
          depreciation_years: number | null
          discount_rate: number | null
          energy_cost: number | null
          environmental_bonus_per_ton: number | null
          equipment_cost: number | null
          government_royalties_percent: number | null
          id: string
          inflation_rate: number | null
          infrastructure_cost: number | null
          installation_cost: number | null
          irr_percentage: number | null
          labor_cost: number | null
          lead_id: string | null
          lead_type: string | null
          location: string | null
          logistics_cost: number | null
          maintenance_cost: number | null
          notes: string | null
          npv_10_years: number | null
          operating_days_per_year: number | null
          other_capex: number | null
          other_opex: number | null
          payback_months: number | null
          plant_type: string | null
          raw_material_cost: number | null
          rcb_price: number | null
          rcb_yield: number | null
          roi_percentage: number | null
          rubber_granules_price: number | null
          rubber_granules_yield: number | null
          status: string | null
          steel_wire_price: number | null
          steel_wire_yield: number | null
          study_name: string
          tax_rate: number | null
          textile_fiber_price: number | null
          textile_fiber_yield: number | null
          total_investment: number | null
          updated_at: string
          utilization_rate: number | null
          working_capital: number | null
        }
        Insert: {
          administrative_cost?: number | null
          annual_ebitda?: number | null
          annual_opex?: number | null
          annual_revenue?: number | null
          collection_model?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          daily_capacity_tons?: number | null
          depreciation_years?: number | null
          discount_rate?: number | null
          energy_cost?: number | null
          environmental_bonus_per_ton?: number | null
          equipment_cost?: number | null
          government_royalties_percent?: number | null
          id?: string
          inflation_rate?: number | null
          infrastructure_cost?: number | null
          installation_cost?: number | null
          irr_percentage?: number | null
          labor_cost?: number | null
          lead_id?: string | null
          lead_type?: string | null
          location?: string | null
          logistics_cost?: number | null
          maintenance_cost?: number | null
          notes?: string | null
          npv_10_years?: number | null
          operating_days_per_year?: number | null
          other_capex?: number | null
          other_opex?: number | null
          payback_months?: number | null
          plant_type?: string | null
          raw_material_cost?: number | null
          rcb_price?: number | null
          rcb_yield?: number | null
          roi_percentage?: number | null
          rubber_granules_price?: number | null
          rubber_granules_yield?: number | null
          status?: string | null
          steel_wire_price?: number | null
          steel_wire_yield?: number | null
          study_name: string
          tax_rate?: number | null
          textile_fiber_price?: number | null
          textile_fiber_yield?: number | null
          total_investment?: number | null
          updated_at?: string
          utilization_rate?: number | null
          working_capital?: number | null
        }
        Update: {
          administrative_cost?: number | null
          annual_ebitda?: number | null
          annual_opex?: number | null
          annual_revenue?: number | null
          collection_model?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          daily_capacity_tons?: number | null
          depreciation_years?: number | null
          discount_rate?: number | null
          energy_cost?: number | null
          environmental_bonus_per_ton?: number | null
          equipment_cost?: number | null
          government_royalties_percent?: number | null
          id?: string
          inflation_rate?: number | null
          infrastructure_cost?: number | null
          installation_cost?: number | null
          irr_percentage?: number | null
          labor_cost?: number | null
          lead_id?: string | null
          lead_type?: string | null
          location?: string | null
          logistics_cost?: number | null
          maintenance_cost?: number | null
          notes?: string | null
          npv_10_years?: number | null
          operating_days_per_year?: number | null
          other_capex?: number | null
          other_opex?: number | null
          payback_months?: number | null
          plant_type?: string | null
          raw_material_cost?: number | null
          rcb_price?: number | null
          rcb_yield?: number | null
          roi_percentage?: number | null
          rubber_granules_price?: number | null
          rubber_granules_yield?: number | null
          status?: string | null
          steel_wire_price?: number | null
          steel_wire_yield?: number | null
          study_name?: string
          tax_rate?: number | null
          textile_fiber_price?: number | null
          textile_fiber_yield?: number | null
          total_investment?: number | null
          updated_at?: string
          utilization_rate?: number | null
          working_capital?: number | null
        }
        Relationships: []
      }
      generated_documents: {
        Row: {
          all_signatures_data: Json | null
          created_at: string
          current_signatures: number | null
          document_name: string
          document_type: string
          field_values: Json | null
          file_url: string | null
          generated_by: string | null
          id: string
          is_signed: boolean | null
          language: string | null
          lead_id: string | null
          lead_type: string | null
          pending_signer_email: string | null
          pending_signer_name: string | null
          required_signatures: number | null
          sent_at: string | null
          sent_to_email: string | null
          signature_data: Json | null
          signature_hash: string | null
          signature_status: string | null
          signature_type: string | null
          signed_at: string | null
          signer_email: string | null
          signer_name: string | null
          template_id: string | null
        }
        Insert: {
          all_signatures_data?: Json | null
          created_at?: string
          current_signatures?: number | null
          document_name: string
          document_type: string
          field_values?: Json | null
          file_url?: string | null
          generated_by?: string | null
          id?: string
          is_signed?: boolean | null
          language?: string | null
          lead_id?: string | null
          lead_type?: string | null
          pending_signer_email?: string | null
          pending_signer_name?: string | null
          required_signatures?: number | null
          sent_at?: string | null
          sent_to_email?: string | null
          signature_data?: Json | null
          signature_hash?: string | null
          signature_status?: string | null
          signature_type?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_name?: string | null
          template_id?: string | null
        }
        Update: {
          all_signatures_data?: Json | null
          created_at?: string
          current_signatures?: number | null
          document_name?: string
          document_type?: string
          field_values?: Json | null
          file_url?: string | null
          generated_by?: string | null
          id?: string
          is_signed?: boolean | null
          language?: string | null
          lead_id?: string | null
          lead_type?: string | null
          pending_signer_email?: string | null
          pending_signer_name?: string | null
          required_signatures?: number | null
          sent_at?: string | null
          sent_to_email?: string | null
          signature_data?: Json | null
          signature_hash?: string | null
          signature_status?: string | null
          signature_type?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_name?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          content: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: string | null
          max_attempts: number
          metadata: Json | null
          params: Json | null
          priority: number | null
          processed_at: string | null
          prompt: string | null
          result: string | null
          result_metadata: Json | null
          source_reference: string | null
          source_type: string
          started_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string | null
          max_attempts?: number
          metadata?: Json | null
          params?: Json | null
          priority?: number | null
          processed_at?: string | null
          prompt?: string | null
          result?: string | null
          result_metadata?: Json | null
          source_reference?: string | null
          source_type: string
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          content?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string | null
          max_attempts?: number
          metadata?: Json | null
          params?: Json | null
          priority?: number | null
          processed_at?: string | null
          prompt?: string | null
          result?: string | null
          result_metadata?: Json | null
          source_reference?: string | null
          source_type?: string
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      google_doc_links: {
        Row: {
          created_at: string | null
          document_id: string
          google_doc_id: string
          google_doc_url: string | null
          id: string
          last_synced_at: string | null
          sync_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          google_doc_id?: string
          google_doc_url?: string | null
          id?: string
          last_synced_at?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          google_doc_id?: string
          google_doc_url?: string | null
          id?: string
          last_synced_at?: string | null
          sync_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_doc_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      honorarios_config: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          tipo_servico: string
          updated_at: string | null
          user_id: string
          valor: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          tipo_servico?: string
          updated_at?: string | null
          user_id: string
          valor?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          tipo_servico?: string
          updated_at?: string | null
          user_id?: string
          valor?: number | null
        }
        Relationships: []
      }
      impact_stats: {
        Row: {
          display_order: number | null
          id: string
          is_active: boolean | null
          key: string
          label_en: string
          label_es: string
          label_it: string
          label_pt: string
          label_zh: string
          suffix: string | null
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          key: string
          label_en: string
          label_es: string
          label_it?: string
          label_pt: string
          label_zh: string
          suffix?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Update: {
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          key?: string
          label_en?: string
          label_es?: string
          label_it?: string
          label_pt?: string
          label_zh?: string
          suffix?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: []
      }
      interaction_feedback: {
        Row: {
          avaliacao: string
          comentario_adicional: string | null
          contexto_correto: boolean | null
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          naturalidade_score: number | null
          resposta_sistema: string
          user_id: string
        }
        Insert: {
          avaliacao?: string
          comentario_adicional?: string | null
          contexto_correto?: boolean | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          naturalidade_score?: number | null
          resposta_sistema?: string
          user_id: string
        }
        Update: {
          avaliacao?: string
          comentario_adicional?: string | null
          contexto_correto?: boolean | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          naturalidade_score?: number | null
          resposta_sistema?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_profile_id: string
          created_at: string
          descricao: string
          id: string
          pago_em: string | null
          status: string
          updated_at: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          client_profile_id: string
          created_at?: string
          descricao: string
          id?: string
          pago_em?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Update: {
          client_profile_id?: string
          created_at?: string
          descricao?: string
          id?: string
          pago_em?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_devices: {
        Row: {
          created_at: string
          device_id: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          last_value: Json | null
          metadata: Json
          name: string
          status: string
          topic: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          last_value?: Json | null
          metadata?: Json
          name: string
          status?: string
          topic: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          last_value?: Json | null
          metadata?: Json
          name?: string
          status?: string
          topic?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      iot_telemetry: {
        Row: {
          device_id: string
          direction: string
          id: string
          payload: Json
          qos: number
          received_at: string
          topic: string
        }
        Insert: {
          device_id: string
          direction?: string
          id?: string
          payload?: Json
          qos?: number
          received_at?: string
          topic: string
        }
        Update: {
          device_id?: string
          direction?: string
          id?: string
          payload?: Json
          qos?: number
          received_at?: string
          topic?: string
        }
        Relationships: []
      }
      knowledge_embeddings: {
        Row: {
          content: string
          content_type: string | null
          created_at: string
          embedding: string | null
          hit_count: number | null
          id: string
          metadata: Json | null
          published_date: string | null
          source: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          content_type?: string | null
          created_at?: string
          embedding?: string | null
          hit_count?: number | null
          id?: string
          metadata?: Json | null
          published_date?: string | null
          source?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string | null
          created_at?: string
          embedding?: string | null
          hit_count?: number | null
          id?: string
          metadata?: Json | null
          published_date?: string | null
          source?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lawyer_presence: {
        Row: {
          id: string
          is_online: boolean | null
          last_seen_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lead_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          lead_id: string
          lead_type: string
          notes: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          lead_id: string
          lead_type: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          lead_id?: string
          lead_type?: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          note: string
          note_type: string | null
          user_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          note: string
          note_type?: string | null
          user_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          note?: string
          note_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_citations: {
        Row: {
          abnt_reference: string | null
          citation_type: Database["public"]["Enums"]["citation_type"]
          context_conversation_id: string | null
          context_document_id: string | null
          created_at: string
          excerpt: string | null
          full_reference: string
          id: string
          is_verified: boolean
          jurisdiction: string
          last_verified_at: string | null
          metadata: Json | null
          official_date: string | null
          official_id: string | null
          official_url: string | null
          reliability_score: number | null
          source_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          validity_status: Database["public"]["Enums"]["citation_validity"]
          verification_hash: string | null
        }
        Insert: {
          abnt_reference?: string | null
          citation_type: Database["public"]["Enums"]["citation_type"]
          context_conversation_id?: string | null
          context_document_id?: string | null
          created_at?: string
          excerpt?: string | null
          full_reference: string
          id?: string
          is_verified?: boolean
          jurisdiction?: string
          last_verified_at?: string | null
          metadata?: Json | null
          official_date?: string | null
          official_id?: string | null
          official_url?: string | null
          reliability_score?: number | null
          source_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          validity_status?: Database["public"]["Enums"]["citation_validity"]
          verification_hash?: string | null
        }
        Update: {
          abnt_reference?: string | null
          citation_type?: Database["public"]["Enums"]["citation_type"]
          context_conversation_id?: string | null
          context_document_id?: string | null
          created_at?: string
          excerpt?: string | null
          full_reference?: string
          id?: string
          is_verified?: boolean
          jurisdiction?: string
          last_verified_at?: string | null
          metadata?: Json | null
          official_date?: string | null
          official_id?: string | null
          official_url?: string | null
          reliability_score?: number | null
          source_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          validity_status?: Database["public"]["Enums"]["citation_validity"]
          verification_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_citations_context_document_id_fkey"
            columns: ["context_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_citations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "citation_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_embeddings: {
        Row: {
          content: string | null
          content_type: string | null
          created_at: string
          embedding: string | null
          fts: unknown
          id: string
          metadata: Json | null
          published_date: string | null
          query_origin: string | null
          source: string | null
          source_label: string | null
          title: string
          url: string | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          created_at?: string
          embedding?: string | null
          fts?: unknown
          id?: string
          metadata?: Json | null
          published_date?: string | null
          query_origin?: string | null
          source?: string | null
          source_label?: string | null
          title: string
          url?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          created_at?: string
          embedding?: string | null
          fts?: unknown
          id?: string
          metadata?: Json | null
          published_date?: string | null
          query_origin?: string | null
          source?: string | null
          source_label?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      local_events: {
        Row: {
          all_day: boolean | null
          category: string | null
          client_profile_id: string | null
          color: string | null
          created_at: string
          description: string | null
          end_at: string | null
          google_event_id: string | null
          id: string
          location: string | null
          processo_id: string | null
          recurrence: string | null
          start_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          category?: string | null
          client_profile_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          processo_id?: string | null
          recurrence?: string | null
          start_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          category?: string | null
          client_profile_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          end_at?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          processo_id?: string | null
          recurrence?: string | null
          start_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loi_documents: {
        Row: {
          company_name: string
          company_type: string
          contact_name: string
          country: string
          created_at: string
          download_count: number | null
          email: string
          estimated_volume: string | null
          expires_at: string
          id: string
          language: string
          last_accessed_at: string | null
          message: string | null
          products_interest: string[]
          registration_id: string | null
          token: string
        }
        Insert: {
          company_name: string
          company_type: string
          contact_name: string
          country: string
          created_at?: string
          download_count?: number | null
          email: string
          estimated_volume?: string | null
          expires_at?: string
          id?: string
          language?: string
          last_accessed_at?: string | null
          message?: string | null
          products_interest: string[]
          registration_id?: string | null
          token: string
        }
        Update: {
          company_name?: string
          company_type?: string
          contact_name?: string
          country?: string
          created_at?: string
          download_count?: number | null
          email?: string
          estimated_volume?: string | null
          expires_at?: string
          id?: string
          language?: string
          last_accessed_at?: string | null
          message?: string | null
          products_interest?: string[]
          registration_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "loi_documents_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "marketplace_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      lovable_events: {
        Row: {
          event_type: string
          id: string
          lovable_id: string | null
          payload: Json
          received_at: string
          user_lovable_id: string | null
        }
        Insert: {
          event_type?: string
          id?: string
          lovable_id?: string | null
          payload?: Json
          received_at?: string
          user_lovable_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          lovable_id?: string | null
          payload?: Json
          received_at?: string
          user_lovable_id?: string | null
        }
        Relationships: []
      }
      lovable_users: {
        Row: {
          created_at: string
          id: string
          lovable_id: string
          metadata: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lovable_id?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lovable_id?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lovable_webhook_requests: {
        Row: {
          error: string | null
          id: string
          method: string | null
          path: string | null
          payload: Json | null
          received_at: string | null
          response_body: Json | null
          signature: string | null
          status: number | null
        }
        Insert: {
          error?: string | null
          id?: string
          method?: string | null
          path?: string | null
          payload?: Json | null
          received_at?: string | null
          response_body?: Json | null
          signature?: string | null
          status?: number | null
        }
        Update: {
          error?: string | null
          id?: string
          method?: string | null
          path?: string | null
          payload?: Json | null
          received_at?: string | null
          response_body?: Json | null
          signature?: string | null
          status?: number | null
        }
        Relationships: []
      }
      marketplace_registrations: {
        Row: {
          assigned_to: string | null
          company_name: string
          company_type: string
          contact_name: string
          country: string
          created_at: string
          email: string
          estimated_volume: string | null
          id: string
          latitude: number | null
          lead_level: string | null
          longitude: number | null
          message: string | null
          next_action: string | null
          next_action_date: string | null
          phone: string | null
          priority: string | null
          products_interest: string[]
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name: string
          company_type: string
          contact_name: string
          country: string
          created_at?: string
          email: string
          estimated_volume?: string | null
          id?: string
          latitude?: number | null
          lead_level?: string | null
          longitude?: number | null
          message?: string | null
          next_action?: string | null
          next_action_date?: string | null
          phone?: string | null
          priority?: string | null
          products_interest: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string
          company_type?: string
          contact_name?: string
          country?: string
          created_at?: string
          email?: string
          estimated_volume?: string | null
          id?: string
          latitude?: number | null
          lead_level?: string | null
          longitude?: number | null
          message?: string | null
          next_action?: string | null
          next_action_date?: string | null
          phone?: string | null
          priority?: string | null
          products_interest?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          agenda_content: string | null
          agenda_generated_at: string | null
          ai_context_summary: string | null
          ai_suggested_topics: Json | null
          attached_documents: Json | null
          convocation_sent_at: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          lead_id: string | null
          lead_type: string | null
          location: string | null
          meeting_link: string | null
          meeting_type: string
          notes: string | null
          participants: Json | null
          plant_type: string | null
          scheduled_at: string | null
          status: string | null
          summary_content: string | null
          summary_generated_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agenda_content?: string | null
          agenda_generated_at?: string | null
          ai_context_summary?: string | null
          ai_suggested_topics?: Json | null
          attached_documents?: Json | null
          convocation_sent_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          lead_type?: string | null
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string
          notes?: string | null
          participants?: Json | null
          plant_type?: string | null
          scheduled_at?: string | null
          status?: string | null
          summary_content?: string | null
          summary_generated_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agenda_content?: string | null
          agenda_generated_at?: string | null
          ai_context_summary?: string | null
          ai_suggested_topics?: Json | null
          attached_documents?: Json | null
          convocation_sent_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          lead_type?: string | null
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string
          notes?: string | null
          participants?: Json | null
          plant_type?: string | null
          scheduled_at?: string | null
          status?: string | null
          summary_content?: string | null
          summary_generated_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mother_commissions: {
        Row: {
          child_project_id: string
          commission_amount_cents: number
          commission_percent: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          original_amount_cents: number
          paid_at: string | null
          status: string
          stripe_payment_id: string
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          child_project_id?: string
          commission_amount_cents: number
          commission_percent?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          original_amount_cents: number
          paid_at?: string | null
          status?: string
          stripe_payment_id: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          child_project_id?: string
          commission_amount_cents?: number
          commission_percent?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          original_amount_cents?: number
          paid_at?: string | null
          status?: string
          stripe_payment_id?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      nda_signatures: {
        Row: {
          created_at: string
          document_hash: string
          document_id: string
          id: string
          signature_hex: string
          signer_id: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          document_hash: string
          document_id: string
          id?: string
          signature_hex: string
          signer_id?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          document_hash?: string
          document_id?: string
          id?: string
          signature_hex?: string
          signer_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      neural_ab_experiments: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          name: string
          scope: string
          started_at: string
          status: string
          traffic_split: number
          variant_a_id: string | null
          variant_b_id: string | null
          winner: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          name: string
          scope?: string
          started_at?: string
          status?: string
          traffic_split?: number
          variant_a_id?: string | null
          variant_b_id?: string | null
          winner?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          name?: string
          scope?: string
          started_at?: string
          status?: string
          traffic_split?: number
          variant_a_id?: string | null
          variant_b_id?: string | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neural_ab_experiments_variant_a_id_fkey"
            columns: ["variant_a_id"]
            isOneToOne: false
            referencedRelation: "neural_prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "neural_ab_experiments_variant_b_id_fkey"
            columns: ["variant_b_id"]
            isOneToOne: false
            referencedRelation: "neural_prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      neural_agent_config: {
        Row: {
          active_modules: Json
          created_at: string
          custom_commands: Json
          custom_instructions: string
          formality_level: number
          humor_mode: string
          id: string
          mirroring_enabled: boolean
          nickname: string
          onboarding_completed: boolean
          orion_voice_id: string | null
          persona: string
          personality_prompt: string
          proactive_vision: boolean
          response_length: string
          speech_style: string
          updated_at: string
          user_id: string
          vision_auto_describe: boolean
          vision_enabled: boolean
          vision_rules: Json
          voice_enabled: boolean
          voice_evolution_data: Json | null
          voice_language: string
          voice_pitch: number
          voice_speed: number
          wake_word: string
        }
        Insert: {
          active_modules?: Json
          created_at?: string
          custom_commands?: Json
          custom_instructions?: string
          formality_level?: number
          humor_mode?: string
          id?: string
          mirroring_enabled?: boolean
          nickname?: string
          onboarding_completed?: boolean
          orion_voice_id?: string | null
          persona?: string
          personality_prompt?: string
          proactive_vision?: boolean
          response_length?: string
          speech_style?: string
          updated_at?: string
          user_id: string
          vision_auto_describe?: boolean
          vision_enabled?: boolean
          vision_rules?: Json
          voice_enabled?: boolean
          voice_evolution_data?: Json | null
          voice_language?: string
          voice_pitch?: number
          voice_speed?: number
          wake_word?: string
        }
        Update: {
          active_modules?: Json
          created_at?: string
          custom_commands?: Json
          custom_instructions?: string
          formality_level?: number
          humor_mode?: string
          id?: string
          mirroring_enabled?: boolean
          nickname?: string
          onboarding_completed?: boolean
          orion_voice_id?: string | null
          persona?: string
          personality_prompt?: string
          proactive_vision?: boolean
          response_length?: string
          speech_style?: string
          updated_at?: string
          user_id?: string
          vision_auto_describe?: boolean
          vision_enabled?: boolean
          vision_rules?: Json
          voice_enabled?: boolean
          voice_evolution_data?: Json | null
          voice_language?: string
          voice_pitch?: number
          voice_speed?: number
          wake_word?: string
        }
        Relationships: []
      }
      neural_child_reports: {
        Row: {
          architecture: Json | null
          child_project: string
          commission_data: Json | null
          created_at: string | null
          event_type: string
          id: string
          raw_report: Json | null
          role_type: string | null
        }
        Insert: {
          architecture?: Json | null
          child_project: string
          commission_data?: Json | null
          created_at?: string | null
          event_type: string
          id?: string
          raw_report?: Json | null
          role_type?: string | null
        }
        Update: {
          architecture?: Json | null
          child_project?: string
          commission_data?: Json | null
          created_at?: string | null
          event_type?: string
          id?: string
          raw_report?: Json | null
          role_type?: string | null
        }
        Relationships: []
      }
      neural_code_patches: {
        Row: {
          applied_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          original_code: string | null
          patch_type: string
          patched_code: string
          proposal_id: string | null
          rolled_back_at: string | null
          status: string | null
          target_function: string
          validation_log: Json | null
          validation_score: number | null
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          original_code?: string | null
          patch_type?: string
          patched_code: string
          proposal_id?: string | null
          rolled_back_at?: string | null
          status?: string | null
          target_function: string
          validation_log?: Json | null
          validation_score?: number | null
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          original_code?: string | null
          patch_type?: string
          patched_code?: string
          proposal_id?: string | null
          rolled_back_at?: string | null
          status?: string | null
          target_function?: string
          validation_log?: Json | null
          validation_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "neural_code_patches_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "neural_evolution_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      neural_evolution_proposals: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          created_at: string
          current_value: string | null
          description: string | null
          evidence: Json | null
          id: string
          impact_estimate: string | null
          proposal_type: string
          proposed_value: string | null
          reasoning: string | null
          scope: string
          status: string
          title: string
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          created_at?: string
          current_value?: string | null
          description?: string | null
          evidence?: Json | null
          id?: string
          impact_estimate?: string | null
          proposal_type: string
          proposed_value?: string | null
          reasoning?: string | null
          scope: string
          status?: string
          title: string
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          created_at?: string
          current_value?: string | null
          description?: string | null
          evidence?: Json | null
          id?: string
          impact_estimate?: string | null
          proposal_type?: string
          proposed_value?: string | null
          reasoning?: string | null
          scope?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      neural_knowledge_base: {
        Row: {
          category: string | null
          chunk_index: number | null
          content: string
          created_at: string
          embedding: string | null
          id: string
          is_processed: boolean | null
          language: string | null
          metadata: Json | null
          source_reference: string | null
          source_type: string
          specialization_id: string | null
          tags: string[] | null
          title: string
          total_chunks: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          chunk_index?: number | null
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_processed?: boolean | null
          language?: string | null
          metadata?: Json | null
          source_reference?: string | null
          source_type?: string
          specialization_id?: string | null
          tags?: string[] | null
          title: string
          total_chunks?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          chunk_index?: number | null
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          is_processed?: boolean | null
          language?: string | null
          metadata?: Json | null
          source_reference?: string | null
          source_type?: string
          specialization_id?: string | null
          tags?: string[] | null
          title?: string
          total_chunks?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neural_knowledge_base_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "neural_specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      neural_learning_data: {
        Row: {
          created_at: string
          id: string
          input_text: string | null
          interaction_type: string
          learned: boolean | null
          metadata: Json | null
          output_text: string | null
          prompt_version_id: string | null
          quality_score: number | null
          specialization_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          input_text?: string | null
          interaction_type: string
          learned?: boolean | null
          metadata?: Json | null
          output_text?: string | null
          prompt_version_id?: string | null
          quality_score?: number | null
          specialization_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          input_text?: string | null
          interaction_type?: string
          learned?: boolean | null
          metadata?: Json | null
          output_text?: string | null
          prompt_version_id?: string | null
          quality_score?: number | null
          specialization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neural_learning_data_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "neural_specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      neural_network_configs: {
        Row: {
          accuracy: number | null
          config: Json
          created_at: string
          description: string | null
          fine_tuned_model_id: string | null
          hyperparameters: Json | null
          id: string
          is_active: boolean | null
          last_trained_at: string | null
          model_type: string
          name: string
          provider: string
          training_file_id: string | null
          training_status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accuracy?: number | null
          config?: Json
          created_at?: string
          description?: string | null
          fine_tuned_model_id?: string | null
          hyperparameters?: Json | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          model_type?: string
          name: string
          provider?: string
          training_file_id?: string | null
          training_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accuracy?: number | null
          config?: Json
          created_at?: string
          description?: string | null
          fine_tuned_model_id?: string | null
          hyperparameters?: Json | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          model_type?: string
          name?: string
          provider?: string
          training_file_id?: string | null
          training_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      neural_orchestrator_cycles: {
        Row: {
          actions_taken: Json | null
          created_at: string
          cycle_type: string
          duration_ms: number | null
          errors_processed: number | null
          id: string
          patches_generated: number | null
          providers_used: string[] | null
          quality_score: number | null
          trigger_source: string
        }
        Insert: {
          actions_taken?: Json | null
          created_at?: string
          cycle_type?: string
          duration_ms?: number | null
          errors_processed?: number | null
          id?: string
          patches_generated?: number | null
          providers_used?: string[] | null
          quality_score?: number | null
          trigger_source?: string
        }
        Update: {
          actions_taken?: Json | null
          created_at?: string
          cycle_type?: string
          duration_ms?: number | null
          errors_processed?: number | null
          id?: string
          patches_generated?: number | null
          providers_used?: string[] | null
          quality_score?: number | null
          trigger_source?: string
        }
        Relationships: []
      }
      neural_pipeline_state: {
        Row: {
          api_calls_total: number
          autonomy_score: number
          best_model: Json | null
          created_at: string
          id: string
          knowledge_count: number
          knowledge_data: Json
          last_trained: string | null
          local_accuracy: number
          local_predictions: number
          loss_history: Json
          phase: string
          state_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          api_calls_total?: number
          autonomy_score?: number
          best_model?: Json | null
          created_at?: string
          id?: string
          knowledge_count?: number
          knowledge_data?: Json
          last_trained?: string | null
          local_accuracy?: number
          local_predictions?: number
          loss_history?: Json
          phase?: string
          state_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          api_calls_total?: number
          autonomy_score?: number
          best_model?: Json | null
          created_at?: string
          id?: string
          knowledge_count?: number
          knowledge_data?: Json
          last_trained?: string | null
          local_accuracy?: number
          local_predictions?: number
          loss_history?: Json
          phase?: string
          state_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      neural_prompt_versions: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          key: string
          scope: string
          score_avg: number | null
          score_count: number | null
          version_label: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          scope?: string
          score_avg?: number | null
          score_count?: number | null
          version_label?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          scope?: string
          score_avg?: number | null
          score_count?: number | null
          version_label?: string
        }
        Relationships: []
      }
      neural_routing_weights: {
        Row: {
          created_at: string
          epoch: number
          id: string
          performance_data: Json | null
          provider_weights: Json
          task_type: string
        }
        Insert: {
          created_at?: string
          epoch?: number
          id?: string
          performance_data?: Json | null
          provider_weights?: Json
          task_type: string
        }
        Update: {
          created_at?: string
          epoch?: number
          id?: string
          performance_data?: Json | null
          provider_weights?: Json
          task_type?: string
        }
        Relationships: []
      }
      neural_runtime_patches: {
        Row: {
          ai_explanation: string | null
          applied_at: string | null
          auto_approved: boolean
          created_at: string
          created_by: string | null
          error_message: string
          error_signature: string
          failure_count: number
          id: string
          is_active: boolean
          patch_code: string
          patch_type: string
          reverted_at: string | null
          success_count: number
          target_module: string | null
        }
        Insert: {
          ai_explanation?: string | null
          applied_at?: string | null
          auto_approved?: boolean
          created_at?: string
          created_by?: string | null
          error_message: string
          error_signature: string
          failure_count?: number
          id?: string
          is_active?: boolean
          patch_code: string
          patch_type?: string
          reverted_at?: string | null
          success_count?: number
          target_module?: string | null
        }
        Update: {
          ai_explanation?: string | null
          applied_at?: string | null
          auto_approved?: boolean
          created_at?: string
          created_by?: string | null
          error_message?: string
          error_signature?: string
          failure_count?: number
          id?: string
          is_active?: boolean
          patch_code?: string
          patch_type?: string
          reverted_at?: string | null
          success_count?: number
          target_module?: string | null
        }
        Relationships: []
      }
      neural_saved_models: {
        Row: {
          accuracy: number | null
          architecture: string | null
          created_at: string
          id: string
          knowledge_count: number | null
          layers: number[] | null
          loss: number | null
          metadata: Json | null
          model_json_path: string | null
          model_name: string
          phase: string | null
          training_duration_ms: number | null
          updated_at: string
          user_id: string
          weights_path: string | null
        }
        Insert: {
          accuracy?: number | null
          architecture?: string | null
          created_at?: string
          id?: string
          knowledge_count?: number | null
          layers?: number[] | null
          loss?: number | null
          metadata?: Json | null
          model_json_path?: string | null
          model_name: string
          phase?: string | null
          training_duration_ms?: number | null
          updated_at?: string
          user_id: string
          weights_path?: string | null
        }
        Update: {
          accuracy?: number | null
          architecture?: string | null
          created_at?: string
          id?: string
          knowledge_count?: number | null
          layers?: number[] | null
          loss?: number | null
          metadata?: Json | null
          model_json_path?: string | null
          model_name?: string
          phase?: string | null
          training_duration_ms?: number | null
          updated_at?: string
          user_id?: string
          weights_path?: string | null
        }
        Relationships: []
      }
      neural_specializations: {
        Row: {
          accuracy: number | null
          accuracy_score: number | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          items_count: number | null
          keywords: string[] | null
          last_trained_at: string | null
          name: string
          prompts: Json | null
          status: string | null
          training_data: Json | null
          training_status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accuracy?: number | null
          accuracy_score?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          items_count?: number | null
          keywords?: string[] | null
          last_trained_at?: string | null
          name: string
          prompts?: Json | null
          status?: string | null
          training_data?: Json | null
          training_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accuracy?: number | null
          accuracy_score?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          items_count?: number | null
          keywords?: string[] | null
          last_trained_at?: string | null
          name?: string
          prompts?: Json | null
          status?: string | null
          training_data?: Json | null
          training_status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      neural_training_log: {
        Row: {
          accuracy: number | null
          created_at: string
          epoch: number
          id: string
          loss: number | null
          neural_profile_id: string
          training_data_sample: Json | null
          user_id: string
          weights_delta: Json | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          epoch: number
          id?: string
          loss?: number | null
          neural_profile_id: string
          training_data_sample?: Json | null
          user_id: string
          weights_delta?: Json | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          epoch?: number
          id?: string
          loss?: number | null
          neural_profile_id?: string
          training_data_sample?: Json | null
          user_id?: string
          weights_delta?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "neural_training_log_neural_profile_id_fkey"
            columns: ["neural_profile_id"]
            isOneToOne: false
            referencedRelation: "user_neural_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      neuromodulation_signals: {
        Row: {
          created_at: string
          exploration_rate: number | null
          id: string
          metadata: Json | null
          provider: string | null
          reason: string | null
          rpe: number | null
          signal_type: string
          strength: number
          target: string
        }
        Insert: {
          created_at?: string
          exploration_rate?: number | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          reason?: string | null
          rpe?: number | null
          signal_type: string
          strength: number
          target: string
        }
        Update: {
          created_at?: string
          exploration_rate?: number | null
          id?: string
          metadata?: Json | null
          provider?: string | null
          reason?: string | null
          rpe?: number | null
          signal_type?: string
          strength?: number
          target?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          interests: string[] | null
          is_active: boolean | null
          language: string | null
          name: string | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          interests?: string[] | null
          is_active?: boolean | null
          language?: string | null
          name?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          interests?: string[] | null
          is_active?: boolean | null
          language?: string | null
          name?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lida: boolean
          link: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lida?: boolean
          link?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lida?: boolean
          link?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          events: string[]
          id: string
          is_active: boolean
          name: string
          updated_at: string
          webhook_type: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          webhook_type: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          webhook_type?: string
          webhook_url?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          affiliate_fee_cents: number
          affiliate_link_id: string | null
          amount_cents: number
          buyer_user_id: string | null
          created_at: string
          creator_fee_cents: number
          id: string
          platform_fee_cents: number
          product_id: string
          status: string
          stripe_session_id: string | null
        }
        Insert: {
          affiliate_fee_cents?: number
          affiliate_link_id?: string | null
          amount_cents?: number
          buyer_user_id?: string | null
          created_at?: string
          creator_fee_cents?: number
          id?: string
          platform_fee_cents?: number
          product_id: string
          status?: string
          stripe_session_id?: string | null
        }
        Update: {
          affiliate_fee_cents?: number
          affiliate_link_id?: string | null
          amount_cents?: number
          buyer_user_id?: string | null
          created_at?: string
          creator_fee_cents?: number
          id?: string
          platform_fee_cents?: number
          product_id?: string
          status?: string
          stripe_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orion_autonomous_agents: {
        Row: {
          agent_name: string
          agent_role: string
          capabilities: Json | null
          category: string
          created_at: string | null
          created_by: string | null
          creation_reason: string | null
          failure_count: number | null
          hf_model_id: string | null
          id: string
          invocation_count: number | null
          is_active: boolean | null
          metadata: Json | null
          parent_agent_id: string | null
          performance_score: number | null
          success_count: number | null
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          agent_name: string
          agent_role?: string
          capabilities?: Json | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          creation_reason?: string | null
          failure_count?: number | null
          hf_model_id?: string | null
          id?: string
          invocation_count?: number | null
          is_active?: boolean | null
          metadata?: Json | null
          parent_agent_id?: string | null
          performance_score?: number | null
          success_count?: number | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string
          agent_role?: string
          capabilities?: Json | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          creation_reason?: string | null
          failure_count?: number | null
          hf_model_id?: string | null
          id?: string
          invocation_count?: number | null
          is_active?: boolean | null
          metadata?: Json | null
          parent_agent_id?: string | null
          performance_score?: number | null
          success_count?: number | null
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orion_autonomous_agents_parent_agent_id_fkey"
            columns: ["parent_agent_id"]
            isOneToOne: false
            referencedRelation: "orion_autonomous_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      orion_frameworks: {
        Row: {
          author_agent: string
          compiled_code: string | null
          confidence_score: number | null
          created_at: string
          created_by: string | null
          dependencies: Json | null
          description: string | null
          downloads: number | null
          exports: string[] | null
          framework_type: Database["public"]["Enums"]["framework_type"]
          id: string
          is_core: boolean | null
          name: string
          parent_framework_id: string | null
          rating_avg: number | null
          rating_count: number | null
          readme_md: string | null
          schema_definition: Json | null
          slug: string
          source_code: string
          status: Database["public"]["Enums"]["framework_status"]
          tags: string[] | null
          updated_at: string
          validation_result: Json | null
          version: string
        }
        Insert: {
          author_agent?: string
          compiled_code?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          dependencies?: Json | null
          description?: string | null
          downloads?: number | null
          exports?: string[] | null
          framework_type?: Database["public"]["Enums"]["framework_type"]
          id?: string
          is_core?: boolean | null
          name: string
          parent_framework_id?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          readme_md?: string | null
          schema_definition?: Json | null
          slug: string
          source_code: string
          status?: Database["public"]["Enums"]["framework_status"]
          tags?: string[] | null
          updated_at?: string
          validation_result?: Json | null
          version?: string
        }
        Update: {
          author_agent?: string
          compiled_code?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          dependencies?: Json | null
          description?: string | null
          downloads?: number | null
          exports?: string[] | null
          framework_type?: Database["public"]["Enums"]["framework_type"]
          id?: string
          is_core?: boolean | null
          name?: string
          parent_framework_id?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          readme_md?: string | null
          schema_definition?: Json | null
          slug?: string
          source_code?: string
          status?: Database["public"]["Enums"]["framework_status"]
          tags?: string[] | null
          updated_at?: string
          validation_result?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "orion_frameworks_parent_framework_id_fkey"
            columns: ["parent_framework_id"]
            isOneToOne: false
            referencedRelation: "orion_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      orion_generation_log: {
        Row: {
          action: string
          agent_role: string
          blocked: boolean | null
          confidence: number | null
          created_at: string
          duration_ms: number | null
          framework_id: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          phase: string
          reasoning: string | null
        }
        Insert: {
          action: string
          agent_role: string
          blocked?: boolean | null
          confidence?: number | null
          created_at?: string
          duration_ms?: number | null
          framework_id?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          phase: string
          reasoning?: string | null
        }
        Update: {
          action?: string
          agent_role?: string
          blocked?: boolean | null
          confidence?: number | null
          created_at?: string
          duration_ms?: number | null
          framework_id?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          phase?: string
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orion_generation_log_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "orion_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      orion_module_installations: {
        Row: {
          config: Json | null
          framework_id: string
          id: string
          installed_at: string
          installed_version: string
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          framework_id: string
          id?: string
          installed_at?: string
          installed_version: string
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json | null
          framework_id?: string
          id?: string
          installed_at?: string
          installed_version?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orion_module_installations_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "orion_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      orion_module_ratings: {
        Row: {
          created_at: string
          framework_id: string
          id: string
          rating: number
          review: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          framework_id: string
          id?: string
          rating: number
          review?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          framework_id?: string
          id?: string
          rating?: number
          review?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orion_module_ratings_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "orion_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      orion_realtime_alerts: {
        Row: {
          alert_type: string
          content: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          monitor_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_type: string
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          monitor_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_type?: string
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          monitor_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orion_realtime_alerts_monitor_id_fkey"
            columns: ["monitor_id"]
            isOneToOne: false
            referencedRelation: "orion_realtime_monitors"
            referencedColumns: ["id"]
          },
        ]
      }
      orion_realtime_monitors: {
        Row: {
          alert_channel: string
          check_interval_minutes: number
          created_at: string
          filters: Json
          id: string
          is_active: boolean
          last_checked_at: string | null
          last_result: Json | null
          monitor_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_channel?: string
          check_interval_minutes?: number
          created_at?: string
          filters?: Json
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_result?: Json | null
          monitor_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_channel?: string
          check_interval_minutes?: number
          created_at?: string
          filters?: Json
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_result?: Json | null
          monitor_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orion_self_analysis: {
        Row: {
          agents_created: string[] | null
          analysis_type: string
          created_at: string | null
          difficulty_level: number | null
          findings: Json | null
          id: string
          resolution: string | null
          target_path: string | null
        }
        Insert: {
          agents_created?: string[] | null
          analysis_type: string
          created_at?: string | null
          difficulty_level?: number | null
          findings?: Json | null
          id?: string
          resolution?: string | null
          target_path?: string | null
        }
        Update: {
          agents_created?: string[] | null
          analysis_type?: string
          created_at?: string | null
          difficulty_level?: number | null
          findings?: Json | null
          id?: string
          resolution?: string | null
          target_path?: string | null
        }
        Relationships: []
      }
      orion_threat_log: {
        Row: {
          countermeasure: string | null
          created_at: string
          details: string | null
          fingerprint: string | null
          id: string
          page_url: string | null
          severity: string
          threat_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          countermeasure?: string | null
          created_at?: string
          details?: string | null
          fingerprint?: string | null
          id?: string
          page_url?: string | null
          severity: string
          threat_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          countermeasure?: string | null
          created_at?: string
          details?: string | null
          fingerprint?: string | null
          id?: string
          page_url?: string | null
          severity?: string
          threat_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      orion_traces: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          operation: string
          spans: Json
          status: string
          total_duration_ms: number | null
          trace_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          operation: string
          spans?: Json
          status?: string
          total_duration_ms?: number | null
          trace_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          operation?: string
          spans?: Json
          status?: string
          total_duration_ms?: number | null
          trace_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orion_voice_samples: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          quality_score: number | null
          sample_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          quality_score?: number | null
          sample_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          quality_score?: number | null
          sample_url?: string
          user_id?: string
        }
        Relationships: []
      }
      otr_conversion_goals: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          month: number
          notes: string | null
          target_conversions: number
          target_leads: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          notes?: string | null
          target_conversions?: number
          target_leads?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          notes?: string | null
          target_conversions?: number
          target_leads?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      partner_profiles: {
        Row: {
          annual_revenue: string | null
          company_linkedin: string | null
          company_registration_number: string | null
          company_website: string | null
          created_at: string
          due_diligence_notes: string | null
          due_diligence_status: string | null
          employees_count: string | null
          id: string
          industry_sector: string | null
          investment_capacity: string | null
          kyc_documents: Json | null
          kyc_status: string | null
          lead_id: string
          lead_type: string
          nda_document_url: string | null
          nda_signed: boolean | null
          nda_signed_at: string | null
          project_description: string | null
          rejection_reason: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          annual_revenue?: string | null
          company_linkedin?: string | null
          company_registration_number?: string | null
          company_website?: string | null
          created_at?: string
          due_diligence_notes?: string | null
          due_diligence_status?: string | null
          employees_count?: string | null
          id?: string
          industry_sector?: string | null
          investment_capacity?: string | null
          kyc_documents?: Json | null
          kyc_status?: string | null
          lead_id: string
          lead_type: string
          nda_document_url?: string | null
          nda_signed?: boolean | null
          nda_signed_at?: string | null
          project_description?: string | null
          rejection_reason?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          annual_revenue?: string | null
          company_linkedin?: string | null
          company_registration_number?: string | null
          company_website?: string | null
          created_at?: string
          due_diligence_notes?: string | null
          due_diligence_status?: string | null
          employees_count?: string | null
          id?: string
          industry_sector?: string | null
          investment_capacity?: string | null
          kyc_documents?: Json | null
          kyc_status?: string | null
          lead_id?: string
          lead_type?: string
          nda_document_url?: string | null
          nda_signed?: boolean | null
          nda_signed_at?: string | null
          project_description?: string | null
          rejection_reason?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      plant_configurations: {
        Row: {
          base_investment: number
          certifications: Json | null
          co2_offset_per_ton: number | null
          created_at: string
          default_capacity: number
          energy_recovery_kwh: number | null
          id: string
          is_active: boolean
          markets: string[] | null
          max_capacity: number
          name: string
          operating_cost_per_ton: number
          payback_months: number | null
          plant_type: string
          revenue_per_ton: number
          roi_annual_pct: number | null
          updated_at: string
        }
        Insert: {
          base_investment?: number
          certifications?: Json | null
          co2_offset_per_ton?: number | null
          created_at?: string
          default_capacity?: number
          energy_recovery_kwh?: number | null
          id?: string
          is_active?: boolean
          markets?: string[] | null
          max_capacity?: number
          name: string
          operating_cost_per_ton?: number
          payback_months?: number | null
          plant_type: string
          revenue_per_ton?: number
          roi_annual_pct?: number | null
          updated_at?: string
        }
        Update: {
          base_investment?: number
          certifications?: Json | null
          co2_offset_per_ton?: number | null
          created_at?: string
          default_capacity?: number
          energy_recovery_kwh?: number | null
          id?: string
          is_active?: boolean
          markets?: string[] | null
          max_capacity?: number
          name?: string
          operating_cost_per_ton?: number
          payback_months?: number | null
          plant_type?: string
          revenue_per_ton?: number
          roi_annual_pct?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      press_releases: {
        Row: {
          content_en: string
          content_es: string
          content_it: string
          content_pt: string
          content_zh: string
          created_at: string
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string
          title_en: string
          title_es: string
          title_it: string
          title_pt: string
          title_zh: string
          updated_at: string
        }
        Insert: {
          content_en: string
          content_es: string
          content_it?: string
          content_pt: string
          content_zh: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          title_en: string
          title_es: string
          title_it?: string
          title_pt: string
          title_zh: string
          updated_at?: string
        }
        Update: {
          content_en?: string
          content_es?: string
          content_it?: string
          content_pt?: string
          content_zh?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          title_en?: string
          title_es?: string
          title_it?: string
          title_pt?: string
          title_zh?: string
          updated_at?: string
        }
        Relationships: []
      }
      pro_bono_requests: {
        Row: {
          created_at: string | null
          descricao_caso: string | null
          documentos_comprovacao: string | null
          email: string | null
          id: string
          nome: string
          notas_internas: string | null
          situacao_financeira: string | null
          status: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao_caso?: string | null
          documentos_comprovacao?: string | null
          email?: string | null
          id?: string
          nome?: string
          notas_internas?: string | null
          situacao_financeira?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao_caso?: string | null
          documentos_comprovacao?: string | null
          email?: string | null
          id?: string
          nome?: string
          notas_internas?: string | null
          situacao_financeira?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      processo_documents: {
        Row: {
          categoria: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          notas: string | null
          processo_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notas?: string | null
          processo_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notas?: string | null
          processo_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processo_documents_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          client_profile_id: string | null
          cliente_nome: string
          comarca: string | null
          created_at: string
          data_distribuicao: string | null
          descricao: string | null
          id: string
          numero_processo: string
          status: string
          tipo: string
          ultima_movimentacao: string | null
          updated_at: string
          user_id: string
          valor_causa: number | null
          vara: string | null
        }
        Insert: {
          client_profile_id?: string | null
          cliente_nome: string
          comarca?: string | null
          created_at?: string
          data_distribuicao?: string | null
          descricao?: string | null
          id?: string
          numero_processo: string
          status?: string
          tipo?: string
          ultima_movimentacao?: string | null
          updated_at?: string
          user_id: string
          valor_causa?: number | null
          vara?: string | null
        }
        Update: {
          client_profile_id?: string | null
          cliente_nome?: string
          comarca?: string | null
          created_at?: string
          data_distribuicao?: string | null
          descricao?: string | null
          id?: string
          numero_processo?: string
          status?: string
          tipo?: string
          ultima_movimentacao?: string | null
          updated_at?: string
          user_id?: string
          valor_causa?: number | null
          vara?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_client_profile_id_fkey"
            columns: ["client_profile_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          commission_percent: number
          created_at: string
          creator_id: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          price_cents: number
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          commission_percent?: number
          created_at?: string
          creator_id: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          price_cents?: number
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          commission_percent?: number
          created_at?: string
          creator_id?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          price_cents?: number
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          areas_atuacao: string[] | null
          avatar_url: string | null
          created_at: string
          email: string | null
          face_descriptor: Json | null
          full_name: string | null
          id: string
          oab_number: string | null
          oab_uf: string | null
          role: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          areas_atuacao?: string[] | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          face_descriptor?: Json | null
          full_name?: string | null
          id?: string
          oab_number?: string | null
          oab_uf?: string | null
          role?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          areas_atuacao?: string[] | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          face_descriptor?: Json | null
          full_name?: string | null
          id?: string
          oab_number?: string | null
          oab_uf?: string | null
          role?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      publicacoes: {
        Row: {
          autor: string
          categoria: string
          conteudo: string
          created_at: string
          data_publicacao: string | null
          id: string
          imagem_capa: string | null
          publicado: boolean
          resumo: string
          slug: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          autor?: string
          categoria?: string
          conteudo: string
          created_at?: string
          data_publicacao?: string | null
          id?: string
          imagem_capa?: string | null
          publicado?: boolean
          resumo: string
          slug?: string | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          autor?: string
          categoria?: string
          conteudo?: string
          created_at?: string
          data_publicacao?: string | null
          id?: string
          imagem_capa?: string | null
          publicado?: boolean
          resumo?: string
          slug?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_notifications: {
        Row: {
          body: string
          created_at: string
          failed_count: number | null
          id: string
          sent_by: string | null
          sent_count: number | null
          title: string
          topic: string | null
          url: string | null
        }
        Insert: {
          body: string
          created_at?: string
          failed_count?: number | null
          id?: string
          sent_by?: string | null
          sent_count?: number | null
          title: string
          topic?: string | null
          url?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          failed_count?: number | null
          id?: string
          sent_by?: string | null
          sent_count?: number | null
          title?: string
          topic?: string | null
          url?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          language: string | null
          p256dh: string
          topics: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          language?: string | null
          p256dh: string
          topics?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          language?: string | null
          p256dh?: string
          topics?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pyrolysis_readings: {
        Row: {
          created_at: string
          id: string
          pid_output: number | null
          sensor_id: string
          setpoint: number | null
          status: string | null
          temperature: number
        }
        Insert: {
          created_at?: string
          id?: string
          pid_output?: number | null
          sensor_id: string
          setpoint?: number | null
          status?: string | null
          temperature: number
        }
        Update: {
          created_at?: string
          id?: string
          pid_output?: number | null
          sensor_id?: string
          setpoint?: number | null
          status?: string | null
          temperature?: number
        }
        Relationships: []
      }
      query_embedding_cache: {
        Row: {
          created_at: string
          embedding: string | null
          expires_at: string | null
          hit_count: number | null
          id: string
          query_hash: string
          query_text: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          query_hash: string
          query_text: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          query_hash?: string
          query_text?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string | null
          id: string
          max_requests: number | null
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          action?: string
          created_at?: string | null
          id?: string
          max_requests?: number | null
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          max_requests?: number | null
          request_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      report_verifications: {
        Row: {
          content_preview: string | null
          created_at: string
          document_date: string
          document_number: string
          generated_at: string
          generated_by: string | null
          generated_document_id: string | null
          id: string
          is_signed: boolean | null
          language: string | null
          last_viewed_at: string | null
          signatory_name: string
          signatory_position: string
          title: string
          verification_hash: string
          views_count: number | null
        }
        Insert: {
          content_preview?: string | null
          created_at?: string
          document_date: string
          document_number: string
          generated_at?: string
          generated_by?: string | null
          generated_document_id?: string | null
          id?: string
          is_signed?: boolean | null
          language?: string | null
          last_viewed_at?: string | null
          signatory_name: string
          signatory_position: string
          title: string
          verification_hash: string
          views_count?: number | null
        }
        Update: {
          content_preview?: string | null
          created_at?: string
          document_date?: string
          document_number?: string
          generated_at?: string
          generated_by?: string | null
          generated_document_id?: string | null
          id?: string
          is_signed?: boolean | null
          language?: string | null
          last_viewed_at?: string | null
          signatory_name?: string
          signatory_position?: string
          title?: string
          verification_hash?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_verifications_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      secretary_summaries: {
        Row: {
          cliente_id: string
          collected_info: Json
          conversation_id: string
          created_at: string
          id: string
          status: string
          summary: string
          updated_at: string
          urgency: string
        }
        Insert: {
          cliente_id: string
          collected_info?: Json
          conversation_id: string
          created_at?: string
          id?: string
          status?: string
          summary?: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          cliente_id?: string
          collected_info?: Json
          conversation_id?: string
          created_at?: string
          id?: string
          status?: string
          summary?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "secretary_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_scan_results: {
        Row: {
          affected_component: string | null
          affected_version: string | null
          auto_fix_applied: boolean | null
          auto_fix_available: boolean | null
          created_at: string
          cve_id: string | null
          cwe_id: string | null
          description: string | null
          fixed_version: string | null
          id: string
          raw_data: Json | null
          recommendation: string | null
          resolved_at: string | null
          scan_run_id: string | null
          scanner_type: string
          severity: string
          status: string
          title: string
        }
        Insert: {
          affected_component?: string | null
          affected_version?: string | null
          auto_fix_applied?: boolean | null
          auto_fix_available?: boolean | null
          created_at?: string
          cve_id?: string | null
          cwe_id?: string | null
          description?: string | null
          fixed_version?: string | null
          id?: string
          raw_data?: Json | null
          recommendation?: string | null
          resolved_at?: string | null
          scan_run_id?: string | null
          scanner_type: string
          severity?: string
          status?: string
          title: string
        }
        Update: {
          affected_component?: string | null
          affected_version?: string | null
          auto_fix_applied?: boolean | null
          auto_fix_available?: boolean | null
          created_at?: string
          cve_id?: string | null
          cwe_id?: string | null
          description?: string | null
          fixed_version?: string | null
          id?: string
          raw_data?: Json | null
          recommendation?: string | null
          resolved_at?: string | null
          scan_run_id?: string | null
          scanner_type?: string
          severity?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_scan_results_scan_run_id_fkey"
            columns: ["scan_run_id"]
            isOneToOne: false
            referencedRelation: "security_scan_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      security_scan_runs: {
        Row: {
          completed_at: string | null
          critical_count: number | null
          error_message: string | null
          high_count: number | null
          id: string
          low_count: number | null
          medium_count: number | null
          scan_metadata: Json | null
          scan_type: string
          security_score: number | null
          started_at: string
          status: string
          total_findings: number | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          critical_count?: number | null
          error_message?: string | null
          high_count?: number | null
          id?: string
          low_count?: number | null
          medium_count?: number | null
          scan_metadata?: Json | null
          scan_type?: string
          security_score?: number | null
          started_at?: string
          status?: string
          total_findings?: number | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          critical_count?: number | null
          error_message?: string | null
          high_count?: number | null
          id?: string
          low_count?: number | null
          medium_count?: number | null
          scan_metadata?: Json | null
          scan_type?: string
          security_score?: number | null
          started_at?: string
          status?: string
          total_findings?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      serpapi_cache: {
        Row: {
          country: string | null
          created_at: string
          expires_at: string
          id: string
          query_hash: string
          query_text: string
          results: Json
        }
        Insert: {
          country?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          query_hash: string
          query_text: string
          results: Json
        }
        Update: {
          country?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          query_hash?: string
          query_text?: string
          results?: Json
        }
        Relationships: []
      }
      shared_documents: {
        Row: {
          created_at: string
          document_id: string
          id: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_envelopes: {
        Row: {
          clicksign_envelope_id: string | null
          created_at: string
          document_id: string | null
          document_title: string
          id: string
          signature_method: string
          signers: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clicksign_envelope_id?: string | null
          created_at?: string
          document_id?: string | null
          document_title: string
          id?: string
          signature_method?: string
          signers?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clicksign_envelope_id?: string | null
          created_at?: string
          document_id?: string | null
          document_title?: string
          id?: string
          signature_method?: string
          signers?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_envelopes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_log: {
        Row: {
          created_at: string
          document_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          signature_hash: string
          signature_type: string
          signer_email: string
          signer_name: string
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          signature_hash: string
          signature_type: string
          signer_email: string
          signer_name: string
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          signature_hash?: string
          signature_type?: string
          signer_email?: string
          signer_name?: string
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      signed_urls: {
        Row: {
          created_at: string | null
          expires_at: string | null
          file_path: string
          id: string
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          file_path?: string
          id?: string
          url?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          file_path?: string
          id?: string
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_connect_accounts: {
        Row: {
          business_type: string | null
          charges_enabled: boolean
          created_at: string
          display_name: string | null
          id: string
          onboarding_complete: boolean
          payouts_enabled: boolean
          stripe_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_type?: string | null
          charges_enabled?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_complete?: boolean
          payouts_enabled?: boolean
          stripe_account_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_type?: string | null
          charges_enabled?: boolean
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_complete?: boolean
          payouts_enabled?: boolean
          stripe_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          prazo: string | null
          prioridade: string
          processo_ref: string | null
          status: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          prazo?: string | null
          prioridade?: string
          processo_ref?: string | null
          status?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          prazo?: string | null
          prioridade?: string
          processo_ref?: string | null
          status?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_communication_context: {
        Row: {
          created_at: string | null
          estilo_comunicacao: string | null
          expressoes_favoritas: string[] | null
          girias_regional: string | null
          historico_interacoes: Json | null
          humor_atual: string | null
          id: string
          nivel_formalidade: number | null
          perfil_fala: string | null
          preferencias_explicitas: Json | null
          reatividade_visual: boolean | null
          topicos_evitar: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estilo_comunicacao?: string | null
          expressoes_favoritas?: string[] | null
          girias_regional?: string | null
          historico_interacoes?: Json | null
          humor_atual?: string | null
          id?: string
          nivel_formalidade?: number | null
          perfil_fala?: string | null
          preferencias_explicitas?: Json | null
          reatividade_visual?: boolean | null
          topicos_evitar?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          estilo_comunicacao?: string | null
          expressoes_favoritas?: string[] | null
          girias_regional?: string | null
          historico_interacoes?: Json | null
          humor_atual?: string | null
          id?: string
          nivel_formalidade?: number | null
          perfil_fala?: string | null
          preferencias_explicitas?: Json | null
          reatividade_visual?: boolean | null
          topicos_evitar?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_google_tokens: {
        Row: {
          access_token: string
          connected_email: string | null
          created_at: string
          id: string
          refresh_token: string | null
          scopes: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_email?: string | null
          created_at?: string
          id?: string
          refresh_token?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_email?: string | null
          created_at?: string
          id?: string
          refresh_token?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_integration_tokens: {
        Row: {
          access_token: string
          connected_email: string | null
          connected_name: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          provider: string
          refresh_token: string | null
          scopes: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          connected_email?: string | null
          connected_name?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          provider: string
          refresh_token?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          connected_email?: string | null
          connected_name?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          refresh_token?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: string
          profile_data: Json | null
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          profile_data?: Json | null
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          profile_data?: Json | null
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_neural_profiles: {
        Row: {
          activation_functions: Json
          best_loss: number | null
          bias_vectors: Json
          created_at: string
          id: string
          initialized_at: string
          knowledge_neurons: Json
          last_loss: number | null
          last_trained_at: string | null
          learning_rate: number
          neurons_per_layer: Json
          num_layers: number
          role: string
          specializations: Json
          training_epochs: number
          updated_at: string
          user_id: string
          weights: Json
        }
        Insert: {
          activation_functions?: Json
          best_loss?: number | null
          bias_vectors?: Json
          created_at?: string
          id?: string
          initialized_at?: string
          knowledge_neurons?: Json
          last_loss?: number | null
          last_trained_at?: string | null
          learning_rate?: number
          neurons_per_layer?: Json
          num_layers?: number
          role?: string
          specializations?: Json
          training_epochs?: number
          updated_at?: string
          user_id: string
          weights?: Json
        }
        Update: {
          activation_functions?: Json
          best_loss?: number | null
          bias_vectors?: Json
          created_at?: string
          id?: string
          initialized_at?: string
          knowledge_neurons?: Json
          last_loss?: number | null
          last_trained_at?: string | null
          learning_rate?: number
          neurons_per_layer?: Json
          num_layers?: number
          role?: string
          specializations?: Json
          training_epochs?: number
          updated_at?: string
          user_id?: string
          weights?: Json
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          ai_tokens_remaining: number
          created_at: string
          expires_at: string | null
          features_enabled: Json
          id: string
          plan_type: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_tokens_remaining?: number
          created_at?: string
          expires_at?: string | null
          features_enabled?: Json
          id?: string
          plan_type?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_tokens_remaining?: number
          created_at?: string
          expires_at?: string | null
          features_enabled?: Json
          id?: string
          plan_type?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_auth_enrollments: {
        Row: {
          created_at: string
          enrollment_quality: number
          failed_attempts: number
          id: string
          is_active: boolean
          last_verified_at: string | null
          locked_until: string | null
          sample_count: number
          updated_at: string
          user_id: string
          verification_count: number
          voice_features: Json
        }
        Insert: {
          created_at?: string
          enrollment_quality?: number
          failed_attempts?: number
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          locked_until?: string | null
          sample_count?: number
          updated_at?: string
          user_id: string
          verification_count?: number
          voice_features?: Json
        }
        Update: {
          created_at?: string
          enrollment_quality?: number
          failed_attempts?: number
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          locked_until?: string | null
          sample_count?: number
          updated_at?: string
          user_id?: string
          verification_count?: number
          voice_features?: Json
        }
        Relationships: []
      }
      voice_auth_log: {
        Row: {
          action: string
          confidence: number | null
          created_at: string
          device_info: Json | null
          id: string
          ip_hint: string | null
          user_id: string | null
        }
        Insert: {
          action?: string
          confidence?: number | null
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_hint?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          confidence?: number | null
          created_at?: string
          device_info?: Json | null
          id?: string
          ip_hint?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      voice_profiles: {
        Row: {
          created_at: string | null
          display_name: string
          elevenlabs_voice_id: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          profile_type: string
          updated_at: string | null
          user_id: string | null
          voice_characteristics: Json | null
          voice_sample_url: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          elevenlabs_voice_id?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          profile_type?: string
          updated_at?: string | null
          user_id?: string | null
          voice_characteristics?: Json | null
          voice_sample_url?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          elevenlabs_voice_id?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          profile_type?: string
          updated_at?: string | null
          user_id?: string | null
          voice_characteristics?: Json | null
          voice_sample_url?: string | null
        }
        Relationships: []
      }
      webhook_subscriptions: {
        Row: {
          callback_url: string
          created_at: string
          description: string | null
          event_type: string
          failure_count: number
          id: string
          is_active: boolean
          last_triggered_at: string | null
          secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          callback_url: string
          created_at?: string
          description?: string | null
          event_type: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          callback_url?: string
          created_at?: string
          description?: string | null
          event_type?: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_connector_settings: {
        Row: {
          connector_id: string
          enabled: boolean
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          connector_id: string
          enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          connector_id?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      youtube_cache: {
        Row: {
          id: string
          updated_at: string
          videos: Json
        }
        Insert: {
          id: string
          updated_at?: string
          videos?: Json
        }
        Update: {
          id?: string
          updated_at?: string
          videos?: Json
        }
        Relationships: []
      }
    }
    Views: {
      available_advogados: {
        Row: {
          nome: string | null
          oab: string | null
          telefone: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _function_name: string
          _max_requests?: number
          _user_id: string
          _window_minutes?: number
        }
        Returns: boolean
      }
      clean_elp_cache: { Args: never; Returns: undefined }
      clean_expired_cache: { Args: never; Returns: undefined }
      cleanup_expired_cache: { Args: never; Returns: number }
      cleanup_expired_embedding_cache: { Args: never; Returns: number }
      cleanup_expired_locks: { Args: never; Returns: number }
      cleanup_expired_rate_limits: { Args: never; Returns: number }
      count_items_needing_embeddings: { Args: never; Returns: number }
      get_child_network_stats: { Args: never; Returns: Json }
      get_items_needing_embeddings: {
        Args: { batch_limit?: number }
        Returns: {
          content: string
          id: string
          source_type: string
          title: string
        }[]
      }
      get_unread_count: { Args: { _user_id: string }; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hybrid_search_legal_v3: {
        Args: {
          authority_weight?: number
          filter_date_from?: string
          filter_date_to?: string
          filter_source?: string
          filter_sources?: string[]
          filter_type?: string
          keyword_weight?: number
          match_count?: number
          query_embedding: string
          query_text: string
          recency_weight?: number
          semantic_weight?: number
        }
        Returns: {
          authority_score: number
          combined_score: number
          content: string
          content_type: string
          id: string
          keyword_score: number
          metadata: Json
          published_date: string
          recency_score: number
          semantic_score: number
          source: string
          source_label: string
          title: string
          url: string
        }[]
      }
      increment_cnpj_cache_hit: {
        Args: { target_cnpj: string }
        Returns: undefined
      }
      increment_elp_cache_hit: { Args: { target_key: string }; Returns: Json }
      increment_loi_download: {
        Args: { loi_token: string }
        Returns: undefined
      }
      increment_report_views: {
        Args: { target_hash: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_client_owner: {
        Args: { _client_profile_id: string; _user_id: string }
        Returns: boolean
      }
      match_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          content_type: string
          id: string
          similarity: number
          source: string
          title: string
        }[]
      }
      match_neural_knowledge: {
        Args: {
          filter_category?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          source_type: string
          tags: string[]
          title: string
        }[]
      }
      search_legal_embeddings: {
        Args: {
          filter_source?: string
          filter_type?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          content_type: string
          id: string
          metadata: Json
          published_date: string
          similarity: number
          source: string
          source_label: string
          title: string
          url: string
        }[]
      }
      search_neural_knowledge:
        | {
            Args: {
              filter_category?: string
              filter_tags?: string[]
              filter_type?: string
              keyword_weight?: number
              match_count?: number
              query_embedding: string
              query_text: string
              recency_weight?: number
              semantic_weight?: number
            }
            Returns: {
              category: string
              combined_score: number
              content: string
              id: string
              keyword_score: number
              recency_score: number
              semantic_score: number
              source_reference: string
              source_type: string
              tags: string[]
              title: string
            }[]
          }
        | {
            Args: {
              filter_type?: string
              keyword_weight?: number
              match_count?: number
              query_embedding: string
              query_text: string
              semantic_weight?: number
            }
            Returns: {
              category: string
              combined_score: number
              content: string
              id: string
              keyword_score: number
              semantic_score: number
              source_reference: string
              source_type: string
              tags: string[]
              title: string
            }[]
          }
      verify_report_by_hash: {
        Args: { target_hash: string }
        Returns: {
          document_title: string
          id: string
          is_valid: boolean
          verification_hash: string
          verified_at: string
          views_count: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "editor"
        | "viewer"
        | "advogado"
        | "cliente"
        | "produtor"
        | "afiliado"
        | "nomade"
      citation_type:
        | "legislation"
        | "jurisprudence"
        | "doctrine"
        | "regulation"
        | "treaty"
        | "custom"
      citation_validity:
        | "vigente"
        | "revogada"
        | "parcialmente_revogada"
        | "pendente"
        | "desconhecida"
      framework_status:
        | "draft"
        | "validating"
        | "published"
        | "deprecated"
        | "blocked"
      framework_type:
        | "ui_component"
        | "business_logic"
        | "full_stack"
        | "utility"
        | "integration"
        | "template"
        | "pipeline"
      match_status:
        | "pending"
        | "confirmed"
        | "false_positive"
        | "escalated"
        | "cleared"
      screening_type:
        | "sanctions"
        | "pep"
        | "criminal"
        | "watchlist"
        | "adverse_media"
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
      app_role: [
        "admin",
        "editor",
        "viewer",
        "advogado",
        "cliente",
        "produtor",
        "afiliado",
        "nomade",
      ],
      citation_type: [
        "legislation",
        "jurisprudence",
        "doctrine",
        "regulation",
        "treaty",
        "custom",
      ],
      citation_validity: [
        "vigente",
        "revogada",
        "parcialmente_revogada",
        "pendente",
        "desconhecida",
      ],
      framework_status: [
        "draft",
        "validating",
        "published",
        "deprecated",
        "blocked",
      ],
      framework_type: [
        "ui_component",
        "business_logic",
        "full_stack",
        "utility",
        "integration",
        "template",
        "pipeline",
      ],
      match_status: [
        "pending",
        "confirmed",
        "false_positive",
        "escalated",
        "cleared",
      ],
      screening_type: [
        "sanctions",
        "pep",
        "criminal",
        "watchlist",
        "adverse_media",
      ],
    },
  },
} as const
