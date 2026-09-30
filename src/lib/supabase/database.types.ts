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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          attachment_path: string | null
          batch_id: string | null
          course_id: string
          created_at: string
          due_at: string
          id: string
          instructions: string
          title: string
          total_marks: number
          type: Database["public"]["Enums"]["assessment_type"]
          updated_at: string
        }
        Insert: {
          attachment_path?: string | null
          batch_id?: string | null
          course_id: string
          created_at?: string
          due_at: string
          id?: string
          instructions: string
          title: string
          total_marks: number
          type: Database["public"]["Enums"]["assessment_type"]
          updated_at?: string
        }
        Update: {
          attachment_path?: string | null
          batch_id?: string | null
          course_id?: string
          created_at?: string
          due_at?: string
          id?: string
          instructions?: string
          title?: string
          total_marks?: number
          type?: Database["public"]["Enums"]["assessment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          level: Database["public"]["Enums"]["course_level"]
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level: Database["public"]["Enums"]["course_level"]
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: Database["public"]["Enums"]["course_level"]
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          areas_to_improve: string | null
          course_id: string
          created_at: string
          effort_rating: Database["public"]["Enums"]["enrollment_rating"] | null
          id: string
          participation_rating:
            | Database["public"]["Enums"]["enrollment_rating"]
            | null
          remarks: string | null
          strengths: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          areas_to_improve?: string | null
          course_id: string
          created_at?: string
          effort_rating?:
            | Database["public"]["Enums"]["enrollment_rating"]
            | null
          id?: string
          participation_rating?:
            | Database["public"]["Enums"]["enrollment_rating"]
            | null
          remarks?: string | null
          strengths?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          areas_to_improve?: string | null
          course_id?: string
          created_at?: string
          effort_rating?:
            | Database["public"]["Enums"]["enrollment_rating"]
            | null
          id?: string
          participation_rating?:
            | Database["public"]["Enums"]["enrollment_rating"]
            | null
          remarks?: string | null
          strengths?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          batch_id: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          school: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          batch_id?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id: string
          is_active?: boolean
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          batch_id?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          course_id: string
          created_at: string
          file_path: string | null
          id: string
          kind: Database["public"]["Enums"]["resource_kind"]
          sort_order: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          kind: Database["public"]["Enums"]["resource_kind"]
          sort_order?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["resource_kind"]
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          about_text: string | null
          academy_name: string | null
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          id: number
          logo_path: string | null
          social_links: Json
          tagline: string | null
          updated_at: string
        }
        Insert: {
          about_text?: string | null
          academy_name?: string | null
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: number
          logo_path?: string | null
          social_links?: Json
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          about_text?: string | null
          academy_name?: string | null
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          id?: number
          logo_path?: string | null
          social_links?: Json
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          assessment_id: string
          counts_toward_report: boolean
          created_at: string
          feedback: string | null
          file_paths: string[]
          id: string
          is_late: boolean
          marked_at: string | null
          marked_by: string | null
          marks: number | null
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          counts_toward_report?: boolean
          created_at?: string
          feedback?: string | null
          file_paths?: string[]
          id?: string
          is_late?: boolean
          marked_at?: string | null
          marked_by?: string | null
          marks?: number | null
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          counts_toward_report?: boolean
          created_at?: string
          feedback?: string | null
          file_paths?: string[]
          id?: string
          is_late?: boolean
          marked_at?: string | null
          marked_by?: string | null
          marks?: number | null
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_password_change: { Args: never; Returns: undefined }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      submit_assignment: {
        Args: { p_assessment_id: string; p_file_paths: string[] }
        Returns: {
          assessment_id: string
          counts_toward_report: boolean
          created_at: string
          feedback: string | null
          file_paths: string[]
          id: string
          is_late: boolean
          marked_at: string | null
          marked_by: string | null
          marks: number | null
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      assessment_type: "assignment" | "test"
      course_level: "O" | "A"
      enrollment_rating:
        | "excellent"
        | "good"
        | "satisfactory"
        | "needs_improvement"
      resource_kind: "file" | "link"
      user_role: "admin" | "teacher" | "student"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assessment_type: ["assignment", "test"],
      course_level: ["O", "A"],
      enrollment_rating: [
        "excellent",
        "good",
        "satisfactory",
        "needs_improvement",
      ],
      resource_kind: ["file", "link"],
      user_role: ["admin", "teacher", "student"],
    },
  },
} as const
