// ============================================================================
// PLACEHOLDER — regenerated in Phase 1 via `supabase gen types typescript`.
// Mirrors the shape `supabase gen types` emits for an empty public schema, so
// the monorepo type-checks before any migration exists. DO NOT hand-edit once
// Phase 1 generates the real file — it is overwritten on every schema change.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
