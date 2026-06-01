import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Dimensions, Image, Pressable, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { getDeck, recordSwipe, type DeckCard } from "@tadpole/core";
import { supabase } from "@/lib/supabase";
import { MatchModal } from "@/components/match-modal";
import { ReportSheet } from "@/components/report-sheet";

const { width } = Dimensions.get("window");
const THRESHOLD = width * 0.26;
const OFF = width * 1.5;

const STAGE_LABELS: Record<string, string> = {
  expecting: "Expecting",
  newborn: "Newborn",
  infant: "Infant",
  toddler: "Toddler",
  child: "Child 4y+",
  multiple: "Multiple kids",
};

type Dir = "like" | "pass";
type SwipeHandle = { fly: (dir: Dir) => void };

const SwipeCard = forwardRef<
  SwipeHandle,
  { card: DeckCard; disabled: boolean; onSwipe: (dir: Dir) => void; onReport: () => void }
>(function SwipeCard({ card, disabled, onSwipe, onReport }, ref) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const flyOut = useCallback(
    (dir: Dir) => {
      x.value = withTiming(dir === "like" ? OFF : -OFF, { duration: 220 }, (finished) => {
        if (finished) runOnJS(onSwipe)(dir);
      });
    },
    [onSwipe, x],
  );

  useImperativeHandle(ref, () => ({ fly: flyOut }), [flyOut]);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > THRESHOLD) {
        const dir: Dir = e.translationX > 0 ? "like" : "pass";
        x.value = withTiming(dir === "like" ? OFF : -OFF, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onSwipe)(dir);
        });
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${interpolate(x.value, [-width, 0, width], [-9, 0, 9], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [10, THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-THRESHOLD, -10], [1, 0], Extrapolation.CLAMP),
  }));

  const sub =
    [card.area_label, card.parenting_stage ? STAGE_LABELS[card.parenting_stage] : null]
      .filter(Boolean)
      .join(" · ") || "tadpole dad";

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ width: "100%" }, cardStyle]}>
        <View
          className="overflow-hidden rounded-3xl border border-ink/10 bg-white/70"
          style={{
            elevation: 6,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 10 },
          }}
        >
          <View className="aspect-[3/4] w-full bg-ink/5">
            {card.avatar_url ? (
              <Image source={{ uri: card.avatar_url }} resizeMode="cover" className="h-full w-full" />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Text className="text-6xl font-semibold text-ink/20">
                  {card.display_name[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}

            <Pressable
              onPress={onReport}
              hitSlop={8}
              accessibilityLabel={`Report or block ${card.display_name}`}
              className="absolute right-3 top-3 rounded-full bg-bg/85 px-3 py-1.5 active:opacity-80"
            >
              <Text className="text-xs font-semibold text-ink/70">report</Text>
            </Pressable>

            <View className="absolute inset-x-0 bottom-0 bg-ink/45 px-4 py-3">
              <Text className="text-2xl font-semibold text-white">{card.display_name}</Text>
              <Text className="text-sm text-white/85">{sub}</Text>
            </View>
          </View>

          {card.bio ? (
            <View className="px-5 py-4">
              <Text className="text-sm leading-relaxed text-ink/80" numberOfLines={4}>
                {card.bio}
              </Text>
            </View>
          ) : null}
        </View>

        {/* drag stamps */}
        <Animated.View style={[{ position: "absolute", top: 22, left: 18 }, likeStyle]}>
          <View className="rounded-lg border-2 border-accent px-3 py-1">
            <Text className="text-xl font-bold uppercase text-accent">hi</Text>
          </View>
        </Animated.View>
        <Animated.View style={[{ position: "absolute", top: 22, right: 18 }, passStyle]}>
          <View className="rounded-lg border-2 border-ink/40 px-3 py-1">
            <Text className="text-xl font-bold uppercase text-ink/50">pass</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

export function Deck() {
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<{
    name: string;
    avatarUrl: string | null;
    matchId: string | null;
  } | null>(null);
  const [reporting, setReporting] = useState<DeckCard | null>(null);
  const cardRef = useRef<SwipeHandle>(null);

  const top = cards[0];

  const refill = useCallback(async () => {
    try {
      const fresh = await getDeck(supabase, { limit: 20 });
      setCards((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...fresh.filter((c) => !seen.has(c.id))];
      });
    } catch {
      /* keep existing cards; non-fatal */
    }
  }, []);

  useEffect(() => {
    let active = true;
    getDeck(supabase, { limit: 20 })
      .then((d) => active && setCards(d))
      .catch(() => active && setError("Couldn't load the deck. Please try again."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const onSwiped = useCallback(
    async (dir: Dir, card: DeckCard) => {
      setBusy(true);
      setError(undefined);
      setCards((prev) => prev.filter((c) => c.id !== card.id)); // it has flown off-screen
      try {
        const res = await recordSwipe(supabase, card.id, dir);
        if (res.matched)
          setMatch({ name: card.display_name, avatarUrl: card.avatar_url, matchId: res.matchId });
        setCards((prev) => {
          if (prev.length <= 2) void refill();
          return prev;
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        setError(
          /limit reached/i.test(msg)
            ? "You've reached today's swipe limit — come back tomorrow."
            : "Couldn't record that swipe. Please try again.",
        );
        // put the card back at the front so they can retry
        setCards((prev) => (prev.some((c) => c.id === card.id) ? prev : [card, ...prev]));
      } finally {
        setBusy(false);
      }
    },
    [refill],
  );

  const retry = useCallback(() => {
    setError(undefined);
    setLoading(true);
    getDeck(supabase, { limit: 20 })
      .then(setCards)
      .catch(() => setError("Still can't load. Try later."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <View className="aspect-[3/4] w-full max-w-sm rounded-3xl border border-ink/10 bg-ink/5" />
        <Text className="mt-6 text-sm text-ink/50">loading the deck…</Text>
      </View>
    );
  }

  if (error && cards.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="text-center text-ink/70">{error}</Text>
        <Pressable
          onPress={retry}
          className="mt-4 rounded-lg border border-ink/15 px-4 py-2 active:opacity-80"
        >
          <Text className="text-sm font-semibold text-ink">try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!top) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <Text className="text-center text-xl font-semibold text-ink">that&apos;s everyone for now</Text>
        <Text className="mt-2 text-center text-sm text-ink/60">
          New dads join all the time. Check back soon, or widen your area in your profile.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-sm">
          {cards[1] ? (
            <View className="absolute inset-x-3 top-3 aspect-[3/4] rounded-3xl border border-ink/5 bg-white/40" />
          ) : null}
          <SwipeCard
            key={top.id}
            ref={cardRef}
            card={top}
            disabled={busy}
            onSwipe={(dir) => onSwiped(dir, top)}
            onReport={() => setReporting(top)}
          />
        </View>
      </View>

      {error ? <Text className="px-6 text-center text-sm text-error">{error}</Text> : null}

      <View className="px-6 pb-8 pt-4">
        <View className="flex-row items-center justify-center gap-8">
          <Pressable
            onPress={() => cardRef.current?.fly("pass")}
            disabled={busy}
            accessibilityLabel="Pass"
            className={`h-16 w-16 items-center justify-center rounded-full border border-ink/15 bg-bg active:scale-95 ${
              busy ? "opacity-50" : ""
            }`}
          >
            <Text className="text-sm font-semibold text-ink/60">pass</Text>
          </Pressable>
          <Pressable
            onPress={() => cardRef.current?.fly("like")}
            disabled={busy}
            accessibilityLabel="Say hi"
            className={`h-16 w-16 items-center justify-center rounded-full bg-accent active:scale-95 ${
              busy ? "opacity-50" : ""
            }`}
          >
            <Text className="text-sm font-semibold text-bg">hi</Text>
          </Pressable>
        </View>
        <Text className="mt-3 text-center text-xs text-ink/40">swipe or tap · platonic, never dating</Text>
      </View>

      {match ? (
        <MatchModal
          name={match.name}
          avatarUrl={match.avatarUrl}
          matchId={match.matchId}
          onClose={() => setMatch(null)}
        />
      ) : null}
      {reporting ? (
        <ReportSheet
          reportedId={reporting.id}
          reportedName={reporting.display_name}
          onClose={() => setReporting(null)}
          onDone={() => {
            setCards((prev) => prev.filter((c) => c.id !== reporting.id));
            setReporting(null);
          }}
        />
      ) : null}
    </View>
  );
}
