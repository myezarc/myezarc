export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      application_files: {
        Row: {
          application_id: string;
          created_at: string;
          file_name: string;
          id: string;
          mime_type: string | null;
          size_bytes: number | null;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          application_id: string;
          created_at?: string;
          file_name: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          application_id?: string;
          created_at?: string;
          file_name?: string;
          id?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "application_files_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          application_pdf_path: string | null;
          created_at: string;
          description: string | null;
          extracted_text: string | null;
          hoa_id: string;
          homeowner_email: string | null;
          homeowner_id: string;
          id: string;
          status: Database["public"]["Enums"]["application_status"];
          submitted_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          application_pdf_path?: string | null;
          created_at?: string;
          description?: string | null;
          extracted_text?: string | null;
          hoa_id: string;
          homeowner_email?: string | null;
          homeowner_id: string;
          id?: string;
          status?: Database["public"]["Enums"]["application_status"];
          submitted_at?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          application_pdf_path?: string | null;
          created_at?: string;
          description?: string | null;
          extracted_text?: string | null;
          hoa_id?: string;
          homeowner_email?: string | null;
          homeowner_id?: string;
          id?: string;
          status?: Database["public"]["Enums"]["application_status"];
          submitted_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_hoa_id_fkey";
            columns: ["hoa_id"];
            isOneToOne: false;
            referencedRelation: "hoas";
            referencedColumns: ["id"];
          },
        ];
      };
      arc_reviews: {
        Row: {
          application_id: string;
          created_at: string;
          decision: Database["public"]["Enums"]["review_decision"];
          findings: Json | null;
          form_section: Json | null;
          homeowner_message: string | null;
          id: string;
          is_final: boolean;
          model: string | null;
          reviewer_id: string | null;
          summary: string | null;
          updated_at: string;
        };
        Insert: {
          application_id: string;
          created_at?: string;
          decision: Database["public"]["Enums"]["review_decision"];
          findings?: Json | null;
          form_section?: Json | null;
          homeowner_message?: string | null;
          id?: string;
          is_final?: boolean;
          model?: string | null;
          reviewer_id?: string | null;
          summary?: string | null;
          updated_at?: string;
        };
        Update: {
          application_id?: string;
          created_at?: string;
          decision?: Database["public"]["Enums"]["review_decision"];
          findings?: Json | null;
          form_section?: Json | null;
          homeowner_message?: string | null;
          id?: string;
          is_final?: boolean;
          model?: string | null;
          reviewer_id?: string | null;
          summary?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "arc_reviews_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      hoa_forms: {
        Row: {
          created_at: string;
          hoa_id: string;
          id: string;
          is_active: boolean;
          storage_path: string;
          title: string;
          updated_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          hoa_id: string;
          id?: string;
          is_active?: boolean;
          storage_path: string;
          title: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          hoa_id?: string;
          id?: string;
          is_active?: boolean;
          storage_path?: string;
          title?: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hoa_forms_hoa_id_fkey";
            columns: ["hoa_id"];
            isOneToOne: false;
            referencedRelation: "hoas";
            referencedColumns: ["id"];
          },
        ];
      };
      hoa_guidelines: {
        Row: {
          created_at: string;
          extracted_text: string | null;
          hoa_id: string;
          id: string;
          is_active: boolean;
          storage_path: string;
          title: string;
          updated_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          extracted_text?: string | null;
          hoa_id: string;
          id?: string;
          is_active?: boolean;
          storage_path: string;
          title: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          extracted_text?: string | null;
          hoa_id?: string;
          id?: string;
          is_active?: boolean;
          storage_path?: string;
          title?: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hoa_guidelines_hoa_id_fkey";
            columns: ["hoa_id"];
            isOneToOne: false;
            referencedRelation: "hoas";
            referencedColumns: ["id"];
          },
        ];
      };
      hoa_memberships: {
        Row: {
          city: string;
          created_at: string;
          email: string;
          hoa_id: string;
          id: string;
          note: string | null;
          phone: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          state: string;
          status: Database["public"]["Enums"]["membership_status"];
          street_address: string;
          unit: string | null;
          updated_at: string;
          user_id: string;
          zip: string;
        };
        Insert: {
          city: string;
          created_at?: string;
          email: string;
          hoa_id: string;
          id?: string;
          note?: string | null;
          phone: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          state: string;
          status?: Database["public"]["Enums"]["membership_status"];
          street_address: string;
          unit?: string | null;
          updated_at?: string;
          user_id: string;
          zip: string;
        };
        Update: {
          city?: string;
          created_at?: string;
          email?: string;
          hoa_id?: string;
          id?: string;
          note?: string | null;
          phone?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          state?: string;
          status?: Database["public"]["Enums"]["membership_status"];
          street_address?: string;
          unit?: string | null;
          updated_at?: string;
          user_id?: string;
          zip?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hoa_memberships_hoa_id_fkey";
            columns: ["hoa_id"];
            isOneToOne: false;
            referencedRelation: "hoas";
            referencedColumns: ["id"];
          },
        ];
      };
      hoas: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          application_id: string;
          body: string;
          created_at: string;
          id: string;
          is_system: boolean;
          sender_id: string;
        };
        Insert: {
          application_id: string;
          body: string;
          created_at?: string;
          id?: string;
          is_system?: boolean;
          sender_id: string;
        };
        Update: {
          application_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          is_system?: boolean;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          address: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_hoa_form: {
        Args: { _hoa_id: string; _storage_path: string; _title: string };
        Returns: string;
      };
      activate_hoa_guideline: {
        Args: {
          _extracted_text: string;
          _hoa_id: string;
          _storage_path: string;
          _title: string;
        };
        Returns: string;
      };
      can_access_hoa: {
        Args: { _hoa_id: string; _user_id: string };
        Returns: boolean;
      };
      claim_first_admin: { Args: Record<PropertyKey, never>; Returns: undefined };
      finalize_arc_review: {
        Args: {
          _application_id: string;
          _decision: Database["public"]["Enums"]["review_decision"];
          _homeowner_message: string;
          _review_id: string;
        };
        Returns: undefined;
      };
      has_approved_membership: {
        Args: { _hoa_id: string; _user_id: string };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_approved_member: { Args: { _user_id: string }; Returns: boolean };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "homeowner" | "reviewer" | "admin";
      application_status:
        | "submitted"
        | "in_review"
        | "approved"
        | "conditional"
        | "rejected"
        | "changes_requested";
      membership_status: "pending" | "approved" | "rejected";
      review_decision: "approved" | "conditional" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["homeowner", "reviewer", "admin"],
      application_status: [
        "submitted",
        "in_review",
        "approved",
        "conditional",
        "rejected",
        "changes_requested",
      ],
      membership_status: ["pending", "approved", "rejected"],
      review_decision: ["approved", "conditional", "rejected"],
    },
  },
} as const;
