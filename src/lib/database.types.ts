export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      areas: {
        Row: {
          city_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          city_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          city_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "areas_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          address_text: string;
          cancel_reason: string | null;
          completed_at: string | null;
          created_at: string;
          customer_id: string;
          decline_reason: string | null;
          id: string;
          listing_id: string;
          notes: string | null;
          provider_id: string;
          scheduled_end: string | null;
          scheduled_start: string;
          snapshot_currency: string;
          snapshot_price_amount: number;
          snapshot_pricing_type: Database["public"]["Enums"]["pricing_type"];
          snapshot_title: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        Insert: {
          address_text: string;
          cancel_reason?: string | null;
          completed_at?: string | null;
          created_at?: string;
          customer_id: string;
          decline_reason?: string | null;
          id?: string;
          listing_id: string;
          notes?: string | null;
          provider_id: string;
          scheduled_end?: string | null;
          scheduled_start: string;
          snapshot_currency: string;
          snapshot_price_amount: number;
          snapshot_pricing_type: Database["public"]["Enums"]["pricing_type"];
          snapshot_title: string;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Update: {
          address_text?: string;
          cancel_reason?: string | null;
          completed_at?: string | null;
          created_at?: string;
          customer_id?: string;
          decline_reason?: string | null;
          id?: string;
          listing_id?: string;
          notes?: string | null;
          provider_id?: string;
          scheduled_end?: string | null;
          scheduled_start?: string;
          snapshot_currency?: string;
          snapshot_price_amount?: number;
          snapshot_pricing_type?: Database["public"]["Enums"]["pricing_type"];
          snapshot_title?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      cities: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          area_id: string;
          availability_note: string | null;
          category_id: string;
          city_id: string;
          cover_image_path: string | null;
          created_at: string;
          currency: string;
          description: string;
          duration_minutes: number | null;
          id: string;
          is_active: boolean;
          price_amount: number;
          pricing_type: Database["public"]["Enums"]["pricing_type"];
          provider_id: string;
          rating_avg: number;
          rating_count: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          area_id: string;
          availability_note?: string | null;
          category_id: string;
          city_id: string;
          cover_image_path?: string | null;
          created_at?: string;
          currency?: string;
          description: string;
          duration_minutes?: number | null;
          id?: string;
          is_active?: boolean;
          price_amount: number;
          pricing_type: Database["public"]["Enums"]["pricing_type"];
          provider_id: string;
          rating_avg?: number;
          rating_count?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          area_id?: string;
          availability_note?: string | null;
          category_id?: string;
          city_id?: string;
          cover_image_path?: string | null;
          created_at?: string;
          currency?: string;
          description?: string;
          duration_minutes?: number | null;
          id?: string;
          is_active?: boolean;
          price_amount?: number;
          pricing_type?: Database["public"]["Enums"]["pricing_type"];
          provider_id?: string;
          rating_avg?: number;
          rating_count?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          booking_id: string | null;
          created_at: string;
          id: string;
          payload: Json;
          read_at: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
          read_at?: string | null;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
          read_at?: string | null;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          area_id: string;
          avatar_path: string | null;
          banner_path: string | null;
          bio: string | null;
          city_id: string;
          created_at: string;
          display_name: string;
          id: string;
          is_active: boolean;
          is_verified: boolean;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          area_id: string;
          avatar_path?: string | null;
          banner_path?: string | null;
          bio?: string | null;
          city_id: string;
          created_at?: string;
          display_name: string;
          id: string;
          is_active?: boolean;
          is_verified?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          area_id?: string;
          avatar_path?: string | null;
          banner_path?: string | null;
          bio?: string | null;
          city_id?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          is_active?: boolean;
          is_verified?: boolean;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          author_id: string;
          booking_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          is_hidden: boolean;
          listing_id: string;
          rating: number;
          target_provider_id: string;
        };
        Insert: {
          author_id: string;
          booking_id: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          is_hidden?: boolean;
          listing_id: string;
          rating: number;
          target_provider_id: string;
        };
        Update: {
          author_id?: string;
          booking_id?: string;
          comment?: string | null;
          created_at?: string;
          id?: string;
          is_hidden?: boolean;
          listing_id?: string;
          rating?: number;
          target_provider_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: true;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_target_provider_id_fkey";
            columns: ["target_provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_target_provider_id_fkey";
            columns: ["target_provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["user_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles_public";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      profiles_public: {
        Row: {
          avatar_path: string | null;
          banner_path: string | null;
          bio: string | null;
          city_id: string | null;
          display_name: string | null;
          id: string | null;
          is_verified: boolean | null;
        };
        Insert: {
          bio?: string | null;
          city_id?: string | null;
          display_name?: string | null;
          id?: string | null;
          is_verified?: boolean | null;
        };
        Update: {
          bio?: string | null;
          city_id?: string | null;
          display_name?: string | null;
          id?: string | null;
          is_verified?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      accept_booking: {
        Args: { p_booking_id: string };
        Returns: {
          address_text: string;
          cancel_reason: string | null;
          completed_at: string | null;
          created_at: string;
          customer_id: string;
          decline_reason: string | null;
          id: string;
          listing_id: string;
          notes: string | null;
          provider_id: string;
          scheduled_end: string | null;
          scheduled_start: string;
          snapshot_currency: string;
          snapshot_price_amount: number;
          snapshot_pricing_type: Database["public"]["Enums"]["pricing_type"];
          snapshot_title: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      add_marketplace_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] };
        Returns: undefined;
      };
      set_my_avatar: {
        Args: { p_path: string | null };
        Returns: undefined;
      };
      set_my_banner: {
        Args: { p_path: string | null };
        Returns: undefined;
      };
      admin_set_listing_active: {
        Args: { is_active: boolean; listing_id: string };
        Returns: undefined;
      };
      admin_set_profile_active: {
        Args: { is_active: boolean; profile_id: string };
        Returns: undefined;
      };
      admin_set_profile_verified: {
        Args: { is_verified: boolean; profile_id: string };
        Returns: undefined;
      };
      admin_set_review_visible: {
        Args: { is_visible: boolean; review_id: string };
        Returns: undefined;
      };
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string };
        Returns: {
          address_text: string;
          cancel_reason: string | null;
          completed_at: string | null;
          created_at: string;
          customer_id: string;
          decline_reason: string | null;
          id: string;
          listing_id: string;
          notes: string | null;
          provider_id: string;
          scheduled_end: string | null;
          scheduled_start: string;
          snapshot_currency: string;
          snapshot_price_amount: number;
          snapshot_pricing_type: Database["public"]["Enums"]["pricing_type"];
          snapshot_title: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      complete_booking: {
        Args: { p_booking_id: string };
        Returns: {
          address_text: string;
          cancel_reason: string | null;
          completed_at: string | null;
          created_at: string;
          customer_id: string;
          decline_reason: string | null;
          id: string;
          listing_id: string;
          notes: string | null;
          provider_id: string;
          scheduled_end: string | null;
          scheduled_start: string;
          snapshot_currency: string;
          snapshot_price_amount: number;
          snapshot_pricing_type: Database["public"]["Enums"]["pricing_type"];
          snapshot_title: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_booking: {
        Args: {
          p_address_text: string;
          p_listing_id: string;
          p_notes: string;
          p_scheduled_end: string;
          p_scheduled_start: string;
        };
        Returns: {
          address_text: string;
          cancel_reason: string | null;
          completed_at: string | null;
          created_at: string;
          customer_id: string;
          decline_reason: string | null;
          id: string;
          listing_id: string;
          notes: string | null;
          provider_id: string;
          scheduled_end: string | null;
          scheduled_start: string;
          snapshot_currency: string;
          snapshot_price_amount: number;
          snapshot_pricing_type: Database["public"]["Enums"]["pricing_type"];
          snapshot_title: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      decline_booking: {
        Args: { p_booking_id: string; p_reason: string };
        Returns: {
          address_text: string;
          cancel_reason: string | null;
          completed_at: string | null;
          created_at: string;
          customer_id: string;
          decline_reason: string | null;
          id: string;
          listing_id: string;
          notes: string | null;
          provider_id: string;
          scheduled_end: string | null;
          scheduled_start: string;
          snapshot_currency: string;
          snapshot_price_amount: number;
          snapshot_pricing_type: Database["public"]["Enums"]["pricing_type"];
          snapshot_title: string;
          status: Database["public"]["Enums"]["booking_status"];
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "bookings";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_booking_customer_names: {
        Args: { p_booking_ids: string[] };
        Returns: {
          booking_id: string;
          customer_display_name: string;
        }[];
      };
      get_public_provider_profiles: {
        Args: {
          p_area_id: string | null;
          p_city_id: string | null;
          p_name_query: string | null;
          p_provider_ids: string[] | null;
        };
        Returns: {
          avatar_path: string | null;
          banner_path: string | null;
          bio: string | null;
          display_name: string;
          id: string;
          is_verified: boolean;
        }[];
      };
      has_role: {
        Args: { requested_role: Database["public"]["Enums"]["user_role"] };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
      is_booking_party: {
        Args: { requested_booking_id: string };
        Returns: boolean;
      };
      is_public_listing: {
        Args: { requested_listing_id: string };
        Returns: boolean;
      };
      mark_notifications_read: {
        Args: { p_notification_id?: string };
        Returns: number;
      };
      submit_review: {
        Args: { p_booking_id: string; p_comment?: string; p_rating: number };
        Returns: {
          author_id: string;
          booking_id: string;
          comment: string | null;
          created_at: string;
          id: string;
          is_hidden: boolean;
          listing_id: string;
          rating: number;
          target_provider_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "reviews";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_account_profile: {
        Args: {
          p_area_id: string;
          p_bio: string;
          p_display_name: string;
          p_phone: string;
        };
        Returns: {
          area_id: string;
          bio: string | null;
          city_id: string;
          created_at: string;
          display_name: string;
          id: string;
          is_active: boolean;
          is_verified: boolean;
          phone: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      booking_status:
        | "requested"
        | "accepted"
        | "declined"
        | "in_progress"
        | "completed"
        | "cancelled_by_customer"
        | "cancelled_by_provider";
      notification_type:
        | "booking_requested"
        | "booking_accepted"
        | "booking_declined"
        | "booking_cancelled"
        | "booking_completed";
      pricing_type: "hourly" | "fixed";
      user_role: "customer" | "provider" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
      booking_status: [
        "requested",
        "accepted",
        "declined",
        "in_progress",
        "completed",
        "cancelled_by_customer",
        "cancelled_by_provider",
      ],
      notification_type: [
        "booking_requested",
        "booking_accepted",
        "booking_declined",
        "booking_cancelled",
        "booking_completed",
      ],
      pricing_type: ["hourly", "fixed"],
      user_role: ["customer", "provider", "admin"],
    },
  },
} as const;
