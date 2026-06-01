import type { ReactNode } from "react";
import { PublicShell } from "@/components/public-chrome";

/**
 * Public chrome for the Wellbeing & Parenting Guides — what logged-out users and
 * search crawlers see. Shares PublicShell (header + footer) with the marketing
 * landing and Activity Finder for one-site consistency. Server Component with NO
 * cookies()/getUser(), so these routes stay statically renderable /
 * ISR-cacheable.
 */
export default function GuidesLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
