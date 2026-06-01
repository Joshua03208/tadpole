import { Link, usePathname } from "expo-router";
import { Text, View } from "react-native";
import { GetHelpButton } from "@/components/crisis";

const NAV = [
  { href: "/home", label: "deck" },
  { href: "/matches", label: "matches" },
  { href: "/profile", label: "profile" },
] as const;

export function AppHeader() {
  const path = usePathname();
  return (
    <View className="flex-row items-center justify-between border-b border-ink/10 bg-bg px-5 pb-3 pt-14">
      <View className="flex-row items-center gap-4">
        <Text className="text-lg font-semibold lowercase text-ink">
          tadpole<Text className="text-accent">.</Text>
        </Text>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} asChild>
            <Text className={`text-sm ${path === n.href ? "font-semibold text-ink" : "text-ink/50"}`}>
              {n.label}
            </Text>
          </Link>
        ))}
      </View>
      <GetHelpButton />
    </View>
  );
}
