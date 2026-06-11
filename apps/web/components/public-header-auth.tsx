"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { SiteHeader, type NavLink } from "@/components/site-header";

// Logged-out: the public bar crawlers + anon visitors see.
const ANON_LINKS: NavLink[] = [
  { href: "/activities", label: "explore" },
  { href: "/guides", label: "guides" },
  { href: "/login", label: "sign in" },
];

// Logged-in: mirrors the authenticated app header (apps/web/app/(app)/layout.tsx)
// so the bar is consistent whether you're on an app page or a public one.
const AUTHED_LINKS: NavLink[] = [
  { href: "/home", label: "deck" },
  { href: "/activities", label: "explore" },
  { href: "/matches", label: "matches" },
  { href: "/profile", label: "profile" },
];

/**
 * Public top bar that adapts to auth state on the CLIENT.
 *
 * The Activity Finder + Guides pages are statically generated (ISR) for SEO, so
 * the server render is always the logged-out bar — crawlers and signed-out
 * visitors see the public nav and the pages stay static. Once hydrated, a
 * signed-in visitor gets the app nav instead of a misleading "sign in" button.
 *
 * Fixes: clicking "explore" while logged in dropped you onto a public page whose
 * "sign in" chrome made it look like you'd been logged out (the session cookie
 * was always still valid — the proxy refreshes it on that request).
 */
export function PublicHeaderAuthAware() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const supabase = getBrowserClient();
    let active = true;
    // getSession() reads the cookie (no network) → minimal swap flash.
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthed(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <SiteHeader brandHref={authed ? "/home" : "/"} links={authed ? AUTHED_LINKS : ANON_LINKS} />;
}
