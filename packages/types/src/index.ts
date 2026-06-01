import type { Database } from "./database.types";

export type { Database, Json } from "./database.types";
export type { Tables, TablesInsert, TablesUpdate, Enums } from "./database.types";

// Convenience aliases against the generated schema.
export type UserRole = Database["public"]["Enums"]["user_role"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type ProfilePrivate = Database["public"]["Tables"]["profile_private"]["Row"];
export type ProfileLocation = Database["public"]["Tables"]["profile_locations"]["Row"];
export type Area = Database["public"]["Tables"]["areas"]["Row"];
export type Swipe = Database["public"]["Tables"]["swipes"]["Row"];
export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type Block = Database["public"]["Tables"]["blocks"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];

// A masked deck card — exactly what get_swipe_deck returns (no lat/lng).
export type DeckCard =
  Database["public"]["Functions"]["get_swipe_deck"]["Returns"][number];
