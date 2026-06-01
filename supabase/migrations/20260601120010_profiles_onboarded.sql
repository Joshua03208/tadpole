-- ============================================================================
-- 0010 — profiles.onboarded_at (Phase 2).
-- Marks when a user finishes the multi-step onboarding. Route protection treats
-- a signed-in user with onboarded_at IS NULL as "needs onboarding". Set by the
-- owner via the normal update path (not a privileged column, so the guard
-- trigger ignores it).
-- ============================================================================

alter table public.profiles add column onboarded_at timestamptz;
