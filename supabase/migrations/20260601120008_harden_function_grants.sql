-- ============================================================================
-- 0008 — harden function execution grants (least privilege).
-- Supabase's default privileges grant EXECUTE on new public functions to anon +
-- authenticated, which the security advisor flags for every SECURITY DEFINER
-- function (lints 0028/0029). Tighten:
--   * anon may execute NONE of our functions.
--   * trigger-only functions are not RPC-callable by anyone (triggers fire
--     regardless of EXECUTE grants, so this is safe).
--   * the rest stay callable by `authenticated` — they are the app's RPCs
--     (get_swipe_deck, unmatch, set_user_role, request_account_deletion) and the
--     RLS helper lookups (current_app_role, is_moderator, has_block_with), each
--     internally guarded by auth.uid()/role checks and caller-scoped. The
--     advisor's residual 0029 notices on these are intentional, not vulnerabilities.
-- ============================================================================

-- anon: execute nothing.
revoke execute on function
  public.current_app_role(),
  public.is_moderator(),
  public.has_block_with(uuid),
  public.get_swipe_deck(int, text, uuid),
  public.unmatch(uuid, boolean),
  public.set_user_role(uuid, public.user_role),
  public.request_account_deletion()
from anon;

-- trigger-only functions: not RPC-callable by anon or authenticated.
revoke execute on function
  public.handle_new_user(),
  public.handle_swipe(),
  public.guard_profile_privileged_columns(),
  public.reports_on_insert(),
  public.set_updated_at(),
  public.audit_log_block_mutations()
from anon, authenticated;

-- Pre-existing project event-trigger function (auto-enables RLS on new public
-- tables) — NOT created by Tadpole's migrations; documented here for transparency.
-- Event-trigger functions need no EXECUTE grants, so revoke to clear the lint.
revoke execute on function public.rls_auto_enable() from anon, authenticated;
