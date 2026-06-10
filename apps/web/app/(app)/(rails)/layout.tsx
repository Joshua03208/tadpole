import type { ReactNode } from "react";
import { FriendsRail } from "@/components/rails/friends-rail";
import { PlacesRail } from "@/components/rails/places-rail";

/**
 * Desktop shell for the standard app pages (deck, matches, profile): a
 * 3-column grid with the friends/new-messages rail on the left and the
 * places-to-go rail on the right. Below lg nothing changes — single column,
 * rails hidden. The chat thread lives OUTSIDE this group on purpose: it keeps
 * its focused full-height layout.
 */
export default function RailsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:gap-6 lg:px-6">
      <aside className="hidden lg:block">
        {/* sticky below the 57px SiteHeader; scrolls independently */}
        <div className="sticky top-[57px] max-h-[calc(100dvh-57px)] overflow-y-auto py-8">
          <FriendsRail />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
      <aside className="hidden lg:block">
        <div className="sticky top-[57px] max-h-[calc(100dvh-57px)] overflow-y-auto py-8">
          <PlacesRail />
        </div>
      </aside>
    </div>
  );
}
