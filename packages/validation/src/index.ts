import { z } from "zod";

// Shared Zod schemas used by BOTH web and mobile forms (and packages/core at the
// data boundary). The DB is the hard gate (atomic 18+, RLS); these mirror it for
// good UX and defence-in-depth.

export const publicEnvSchema = z.object({
  supabaseUrl: z.string().min(1, "Supabase URL is required"),
  supabaseAnonKey: z.string().min(1, "Supabase anon key is required"),
});
export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const PARENTING_STAGES = [
  "expecting",
  "newborn",
  "infant",
  "toddler",
  "child",
  "multiple",
] as const;
export type ParentingStage = (typeof PARENTING_STAGES)[number];

// ---- 18+ self-declared DOB (client mirror of the DB gate) ------------------
export function isAdultDob(dob: string): boolean {
  const d = new Date(`${dob}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const cutoff = new Date(
    Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()),
  );
  return d.getTime() <= cutoff.getTime();
}

export const dobSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth as YYYY-MM-DD.")
  .refine(isAdultDob, { message: "You must be 18 or older to use Tadpole." });

// ---- bio: no contact details / solicitation -------------------------------
const PHONE_RE = /(?:\+?\d[\s().-]?){7,}/;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|co|net|org|io|app|uk)\b)/i;

export function bioHasContactDetails(bio: string): boolean {
  return PHONE_RE.test(bio) || EMAIL_RE.test(bio) || URL_RE.test(bio);
}

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Please enter a name.")
  .max(50, "Keep your name under 50 characters.");

export const bioSchema = z
  .string()
  .trim()
  .max(500, "Keep your bio under 500 characters.")
  .refine((b) => b.length === 0 || !bioHasContactDetails(b), {
    message: "Please don't put phone numbers, emails, or links in your bio.",
  });

// ---- signup ----------------------------------------------------------------
export const signUpSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
  dateOfBirth: dobSchema,
  displayName: displayNameSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});
export type SignInInput = z.infer<typeof signInSchema>;

// ---- onboarding / profile (interests deferred per Phase 2 decisions) -------
export const onboardingProfileSchema = z.object({
  displayName: displayNameSchema,
  parentingStage: z.enum(PARENTING_STAGES).nullable().optional(),
  // Coarse area: canonical label + normalized slug from the bundled UK places.
  areaLabel: z.string().max(120).nullable().optional(),
  areaSlug: z.string().max(120).nullable().optional(),
  bio: bioSchema.optional(),
});
export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;

// ---- precise location opt-in (only written when the user opts in) ----------
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LocationInput = z.infer<typeof locationSchema>;

// ---- reports ---------------------------------------------------------------
// Mirrors the DB reports_reason CHECK. `immediate` reasons auto-escalate to
// severity 'immediate' server-side (child_safety / self_harm / threats).
export const REPORT_REASON_VALUES = [
  "harassment",
  "threats",
  "hate",
  "sexual_solicitation",
  "child_safety",
  "self_harm",
  "scam",
  "spam",
  "impersonation",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASON_VALUES)[number];

export const REPORT_REASONS: ReadonlyArray<{
  value: ReportReason;
  label: string;
  immediate?: boolean;
}> = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "threats", label: "Threats or intimidation", immediate: true },
  { value: "child_safety", label: "Child-safety concern", immediate: true },
  { value: "self_harm", label: "Self-harm or suicide concern", immediate: true },
  { value: "hate", label: "Hateful content" },
  { value: "sexual_solicitation", label: "Sexual or romantic solicitation" },
  { value: "scam", label: "Scam or fraud" },
  { value: "spam", label: "Spam" },
  { value: "impersonation", label: "Impersonation / fake profile" },
  { value: "other", label: "Something else" },
];

export const reportSchema = z.object({
  reason: z.enum(REPORT_REASON_VALUES),
  detail: z.string().max(1000).optional(),
});
export type ReportInput = z.infer<typeof reportSchema>;

// ---- messages --------------------------------------------------------------
// Text-only. Mirrors the DB body CHECK (1..2000). Deliberately NO contact-detail
// stripping: sharing a number with a chosen match to arrange a meet-up is normal
// and expected (unlike the semi-public bio).
export const MESSAGE_MAX = 2000;
export const messageSchema = z
  .string()
  .trim()
  .min(1, "Type a message.")
  .max(MESSAGE_MAX, `Keep messages under ${MESSAGE_MAX} characters.`);
export type MessageInput = z.infer<typeof messageSchema>;
