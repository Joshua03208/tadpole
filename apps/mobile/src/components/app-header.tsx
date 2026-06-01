import { Link, usePathname } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { GetHelpButton } from "@/components/crisis";

const NAV = [
  { href: "/home", label: "deck" },
  { href: "/matches", label: "matches" },
  { href: "/activities", label: "explore" },
  { href: "/guides", label: "guides" },
  { href: "/profile", label: "profile" },
] as const;

// "explore" and "guides" stay highlighted across their whole subtrees (list +
// detail); the other tabs are single screens, so they match exactly.
function isActive(href: string, path: string) {
  if (href === "/activities" || href === "/guides")
    return path === href || path.startsWith(`${href}/`);
  return path === href;
}

function Wordmark() {
  return (
    <Text className="text-lg font-semibold lowercase text-ink">
      tadpole<Text className="text-accent">.</Text>
    </Text>
  );
}

// Guest header: shown when there's no session (logged-out users browsing the
// public Activity Finder). Exposes only "explore" + auth CTAs — never deck /
// matches / profile, so the gated social core stays invisible to guests.
function PublicHeader({ path }: { path: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-ink/10 bg-bg px-5 pb-3 pt-14">
      <View className="flex-row items-center gap-4">
        <Wordmark />
        <Link href="/activities" asChild>
          <Text
            className={`text-sm active:opacity-70 ${
              isActive("/activities", path) ? "font-semibold text-ink" : "text-ink/50"
            }`}
          >
            explore
          </Text>
        </Link>
        <Link href="/guides" asChild>
          <Text
            className={`text-sm active:opacity-70 ${
              isActive("/guides", path) ? "font-semibold text-ink" : "text-ink/50"
            }`}
          >
            guides
          </Text>
        </Link>
      </View>
      <View className="flex-row items-center gap-3">
        <GetHelpButton />
        <Link href="/sign-in" asChild>
          <Text className="text-sm text-ink/50 active:opacity-70">log in</Text>
        </Link>
        <Link href="/sign-up" asChild>
          <Text className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-bg active:opacity-70">
            sign up
          </Text>
        </Link>
      </View>
    </View>
  );
}

export function AppHeader() {
  const path = usePathname();
  const { session, loading } = useAuth();

  // While the session is still resolving, show a neutral header (wordmark only)
  // so a signed-in user opening /activities doesn't flash the guest header.
  if (loading) {
    return (
      <View className="flex-row items-center justify-between border-b border-ink/10 bg-bg px-5 pb-3 pt-14">
        <Wordmark />
      </View>
    );
  }

  // Logged-out (guest) browsing of the public Activity Finder gets the public
  // variant. Signed-in screens always have a session, so they're unaffected.
  if (!session) return <PublicHeader path={path} />;

  return (
    <View className="flex-row items-center justify-between border-b border-ink/10 bg-bg px-5 pb-3 pt-14">
      <View className="flex-row items-center gap-4">
        <Wordmark />
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} asChild>
            <Text className={`text-sm ${isActive(n.href, path) ? "font-semibold text-ink" : "text-ink/50"}`}>
              {n.label}
            </Text>
          </Link>
        ))}
      </View>
      <GetHelpButton />
    </View>
  );
}
