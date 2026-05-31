// Liveness probe — static so it never touches Supabase at build time.
export const dynamic = "force-static";

export function GET() {
  return Response.json({ status: "ok", service: "tadpole-web", phase: 0 });
}
