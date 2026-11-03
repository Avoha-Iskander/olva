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
  public: {
    Tables: {
      aisles: {
        Row: {
          id: number
          name: string
          position: number
        }
        Insert: {
          id?: never
          name: string
          position: number
        }
        Update: {
          id?: never
          name?: string
          position?: number
        }
        Relationships: []
      }
      auto_list_shares: {
        Row: {
          created_at: string
          owner_id: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          shared_with: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          shared_with?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      item_aliases: {
        Row: {
          alias: string
          item_id: string
        }
        Insert: {
          alias: string
          item_id: string
        }
        Update: {
          alias?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_aliases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_overrides: {
        Row: {
          aisle_id: number | null
          is_staple: boolean | null
          item_id: string
          purchase_unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aisle_id?: number | null
          is_staple?: boolean | null
          item_id: string
          purchase_unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          aisle_id?: number | null
          is_staple?: boolean | null
          item_id?: string
          purchase_unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_overrides_aisle_id_fkey"
            columns: ["aisle_id"]
            isOneToOne: false
            referencedRelation: "aisles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_overrides_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_overrides_purchase_unit_fkey"
            columns: ["purchase_unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
        ]
      }
      items: {
        Row: {
          aisle_id: number
          created_at: string
          default_unit: string
          id: string
          is_staple: boolean
          name: string
          owner_id: string | null
          purchase_unit: string | null
        }
        Insert: {
          aisle_id: number
          created_at?: string
          default_unit: string
          id?: string
          is_staple?: boolean
          name: string
          owner_id?: string | null
          purchase_unit?: string | null
        }
        Update: {
          aisle_id?: number
          created_at?: string
          default_unit?: string
          id?: string
          is_staple?: boolean
          name?: string
          owner_id?: string | null
          purchase_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_aisle_id_fkey"
            columns: ["aisle_id"]
            isOneToOne: false
            referencedRelation: "aisles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_default_unit_fkey"
            columns: ["default_unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "items_purchase_unit_fkey"
            columns: ["purchase_unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
        ]
      }
      library_shares: {
        Row: {
          created_at: string
          owner_id: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          shared_with: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          shared_with?: string
        }
        Relationships: []
      }
      list_shares: {
        Row: {
          created_at: string
          list_id: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          list_id: string
          shared_with: string
        }
        Update: {
          created_at?: string
          list_id?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_shares_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      prelist_items: {
        Row: {
          created_at: string
          item_id: string
          position: number
          quantity: number
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          position?: number
          quantity: number
          unit: string
          user_id?: string
        }
        Update: {
          created_at?: string
          item_id?: string
          position?: number
          quantity?: number
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prelist_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prelist_items_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_servings: number
          display_name: string
          id: string
          onboarded: boolean
          prelist_initialized: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_servings?: number
          display_name?: string
          id: string
          onboarded?: boolean
          prelist_initialized?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_servings?: number
          display_name?: string
          id?: string
          onboarded?: boolean
          prelist_initialized?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      recipe_collections: {
        Row: {
          collection_id: string
          recipe_id: string
        }
        Insert: {
          collection_id: string
          recipe_id: string
        }
        Update: {
          collection_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_collections_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_imports: {
        Row: {
          created_at: string
          error: string | null
          id: string
          model: string | null
          owner_id: string
          photo_paths: string[]
          result: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          model?: string | null
          owner_id?: string
          photo_paths: string[]
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          model?: string | null
          owner_id?: string
          photo_paths?: string[]
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          item_id: string
          note: string | null
          position: number
          quantity: number | null
          recipe_id: string
          unit: string | null
        }
        Insert: {
          id?: string
          item_id: string
          note?: string | null
          position: number
          quantity?: number | null
          recipe_id: string
          unit?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          note?: string | null
          position?: number
          quantity?: number | null
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
        ]
      }
      recipe_shares: {
        Row: {
          created_at: string
          recipe_id: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          recipe_id: string
          shared_with: string
        }
        Update: {
          created_at?: string
          recipe_id?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_shares_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          book_page: number | null
          book_title: string | null
          copied_from: string | null
          created_at: string
          id: string
          import_photo_path: string | null
          is_example: boolean
          owner_id: string
          photo_path: string | null
          servings: number
          steps: string[]
          thumb_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          book_page?: number | null
          book_title?: string | null
          copied_from?: string | null
          created_at?: string
          id?: string
          import_photo_path?: string | null
          is_example?: boolean
          owner_id?: string
          photo_path?: string | null
          servings: number
          steps?: string[]
          thumb_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          book_page?: number | null
          book_title?: string | null
          copied_from?: string | null
          created_at?: string
          id?: string
          import_photo_path?: string | null
          is_example?: boolean
          owner_id?: string
          photo_path?: string | null
          servings?: number
          steps?: string[]
          thumb_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_copied_from_fkey"
            columns: ["copied_from"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          kind: string
          list_id: string | null
          owner_id: string
          recipe_id: string | null
          token_hash: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          kind: string
          list_id?: string | null
          owner_id?: string
          recipe_id?: string | null
          token_hash: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          list_id?: string | null
          owner_id?: string
          recipe_id?: string | null
          token_hash?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_links_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_items: {
        Row: {
          adjusted: boolean
          changed: boolean
          checked: boolean
          checked_at: string | null
          checked_by: string | null
          computed_quantity: number | null
          created_at: string
          id: string
          included: boolean
          item_id: string
          line_key: string
          list_id: string
          origin: string
          quantity: number
          recipe_ids: string[]
          unit: string
        }
        Insert: {
          adjusted?: boolean
          changed?: boolean
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          computed_quantity?: number | null
          created_at?: string
          id?: string
          included?: boolean
          item_id: string
          line_key: string
          list_id: string
          origin: string
          quantity: number
          recipe_ids?: string[]
          unit: string
        }
        Update: {
          adjusted?: boolean
          changed?: boolean
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          computed_quantity?: number | null
          created_at?: string
          id?: string
          included?: boolean
          item_id?: string
          line_key?: string
          list_id?: string
          origin?: string
          quantity?: number
          recipe_ids?: string[]
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
        ]
      }
      shopping_list_recipes: {
        Row: {
          list_id: string
          position: number
          recipe_id: string
          servings: number
        }
        Insert: {
          list_id: string
          position: number
          recipe_id: string
          servings: number
        }
        Update: {
          list_id?: string
          position?: number
          recipe_id?: string
          servings?: number
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_recipes_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      unit_conversions: {
        Row: {
          factor: number
          from_unit: string
          id: string
          item_id: string
          owner_id: string | null
          to_unit: string
        }
        Insert: {
          factor: number
          from_unit: string
          id?: string
          item_id: string
          owner_id?: string | null
          to_unit: string
        }
        Update: {
          factor?: number
          from_unit?: string
          id?: string
          item_id?: string
          owner_id?: string | null
          to_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_conversions_from_unit_fkey"
            columns: ["from_unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "unit_conversions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_conversions_to_unit_fkey"
            columns: ["to_unit"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["code"]
          },
        ]
      }
      units: {
        Row: {
          code: string
          kind: string
          label: string
          position: number
          to_base: number | null
        }
        Insert: {
          code: string
          kind: string
          label: string
          position: number
          to_base?: number | null
        }
        Update: {
          code?: string
          kind?: string
          label?: string
          position?: number
          to_base?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_share_link: { Args: { token: string }; Returns: string }
      copy_recipe: { Args: { source: string }; Returns: string }
      delete_own_account: { Args: never; Returns: undefined }
      ensure_my_prelist: { Args: never; Returns: undefined }
      finalize_list: {
        Args: { lines: Json; target_list: string }
        Returns: undefined
      }
      ensure_my_profile: { Args: never; Returns: undefined }
      preview_share_link: {
        Args: { token: string }
        Returns: {
          kind: string
          owner_name: string
          list_created_at: string
          recipe_title: string
          status: string
        }[]
      }
      save_extras: {
        Args: { lines: Json; target_list: string }
        Returns: undefined
      }
      save_recipe: { Args: { recipe: Json }; Returns: string }
      save_review: {
        Args: { lines: Json; target_list: string }
        Returns: undefined
      }
      search_my_recipes: {
        Args: { collection?: string; search?: string }
        Returns: {
          book_page: number | null
          book_title: string | null
          copied_from: string | null
          created_at: string
          id: string
          import_photo_path: string | null
          is_example: boolean
          owner_id: string
          photo_path: string | null
          servings: number
          steps: string[]
          thumb_path: string | null
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "recipes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_list_recipes: {
        Args: { recipes: Json; target_list: string }
        Returns: undefined
      }
      share_list_by_email: {
        Args: { kind: string; target_email: string; target_list: string }
        Returns: string
      }
      share_by_email: {
        Args: { kind: string; target_email: string; target_recipe: string }
        Returns: string
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
  public: {
    Enums: {},
  },
} as const
