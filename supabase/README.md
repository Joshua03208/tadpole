# supabase

Versioned database for Tadpole. **Schema lives here, never in dashboard click-ops** (CLAUDE.md). RLS is default-deny on every table; matches are created only by the `handle_swipe` trigger.

## Phase 1 setup (not done in Phase 0)

The Supabase CLI is not yet installed on this machine. In Phase 1, against the UK/EU dev/staging project:

```powershell
# one-off
npx -y supabase login
npx -y supabase init                       # generates config.toml (version-matched)
npx -y supabase link --project-ref <ref>   # SUPABASE_PROJECT_ID

# per migration
npx -y supabase migration new <name>       # author SQL in migrations/
npx -y supabase db push                    # apply to the linked project
npx -y supabase gen types typescript --project-id <ref> > ../packages/types/src/database.types.ts
```

After **any** schema change, regenerate the types into `packages/types` (CLAUDE.md non-negotiable).

## Environments

- **dev/staging:** one UK/EU cloud project (this is the validation target — RLS + the `handle_swipe` trigger are exercised against real cloud from the start).
- **prod:** a second project stood up at the pre-launch checkpoint (free tier allows 2 projects).

Migrations are validated against staging in CI before prod ever sees them.
