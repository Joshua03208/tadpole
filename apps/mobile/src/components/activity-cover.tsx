import { Image, Text, View } from "react-native";

// Per-category tint + a tiny geometric motif so the fallback reads as
// intentional, not a broken/placeholder image. Pure NativeWind Views only
// (react-native-svg isn't installed and the brief forbids new deps); each
// motif is built from rounded blocks layered behind the title initial.
// Unknown categories fall back to a neutral accent treatment.
type Motif = "blob" | "leaf" | "cup" | "wave" | "ring";

const CATEGORY_STYLE: Record<string, { motif: Motif }> = {
  "soft-play": { motif: "blob" },
  parks: { motif: "leaf" },
  cafes: { motif: "cup" },
  "swim-classes": { motif: "wave" },
  playgroups: { motif: "ring" },
};

function Motif({ kind }: { kind: Motif }) {
  // Soft, low-contrast accent shapes — they sit behind the initial and never
  // compete with it. Absolute-positioned within the cover.
  switch (kind) {
    case "leaf":
      return (
        <>
          <View className="absolute -right-4 -top-3 h-20 w-20 rounded-full bg-accent/15" />
          <View className="absolute bottom-2 left-3 h-10 w-10 rounded-tl-3xl rounded-br-3xl bg-accent/20" />
        </>
      );
    case "cup":
      return (
        <>
          <View className="absolute -bottom-5 -left-3 h-20 w-20 rounded-t-full bg-accent/15" />
          <View className="absolute right-4 top-4 h-8 w-8 rounded-full border-2 border-accent/25" />
        </>
      );
    case "wave":
      return (
        <>
          <View className="absolute bottom-2 left-0 right-0 h-10 rounded-t-[40px] bg-accent/15" />
          <View className="absolute -top-4 left-6 h-16 w-16 rounded-full bg-accent/12" />
        </>
      );
    case "ring":
      return (
        <>
          <View className="absolute -right-5 -bottom-5 h-24 w-24 rounded-full border-4 border-accent/20" />
          <View className="absolute left-3 top-3 h-6 w-6 rounded-full bg-accent/20" />
        </>
      );
    case "blob":
    default:
      return (
        <>
          <View className="absolute -left-4 -top-4 h-24 w-24 rounded-[40px] bg-accent/15" />
          <View className="absolute bottom-3 right-4 h-9 w-9 rounded-2xl bg-accent/20" />
        </>
      );
  }
}

export function ActivityCover({
  coverUrl,
  title,
  categorySlug,
  rounded = "rounded-2xl",
  heightClass = "h-40",
}: {
  coverUrl: string | null;
  title: string;
  categorySlug: string;
  /** Tailwind rounding class — card uses rounded-2xl, detail a larger radius. */
  rounded?: string;
  /** Tailwind height class so card + detail can size differently. */
  heightClass?: string;
}) {
  if (coverUrl) {
    return (
      <Image
        source={{ uri: coverUrl }}
        accessibilityLabel={title}
        resizeMode="cover"
        className={`w-full ${heightClass} ${rounded} bg-accent/10`}
      />
    );
  }

  const initial = title.trim()[0]?.toUpperCase() ?? "T";
  const motif: Motif = CATEGORY_STYLE[categorySlug]?.motif ?? "blob";

  return (
    <View
      accessibilityLabel={title}
      className={`w-full ${heightClass} ${rounded} overflow-hidden bg-accent/10`}
    >
      <Motif kind={motif} />
      <View className="flex-1 items-center justify-center">
        <Text className="text-4xl font-semibold text-accent">{initial}</Text>
      </View>
    </View>
  );
}
