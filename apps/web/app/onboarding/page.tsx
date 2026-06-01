"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  completeOnboarding,
  getMyProfile,
  isOnboarded,
  listAreas,
  setMyLocation,
  uploadAvatar,
} from "@tadpole/core";
import {
  PARENTING_STAGES,
  bioHasContactDetails,
  displayNameSchema,
  type ParentingStage,
} from "@tadpole/validation";
import type { Area } from "@tadpole/types";
import { getBrowserClient } from "@/lib/supabase/client";
import { processAvatar } from "@/lib/avatar";
import { Button, Field, FormError, Input, Select, Textarea } from "@/components/form";

const STAGE_LABELS: Record<ParentingStage, string> = {
  expecting: "Expecting",
  newborn: "Newborn (0–3m)",
  infant: "Infant (3–12m)",
  toddler: "Toddler (1–3y)",
  child: "Child (4y+)",
  multiple: "Multiple kids",
};

const STEPS = ["name", "stage", "bio", "photo", "location"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const client = useMemo(() => getBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [areas, setAreas] = useState<Area[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [parentingStage, setParentingStage] = useState<ParentingStage | "">("");
  const [areaId, setAreaId] = useState<string>("");
  const [bio, setBio] = useState("");
  const [avatarBody, setAvatarBody] = useState<ArrayBuffer | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [shareLocation, setShareLocation] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [profile, areaRows] = await Promise.all([getMyProfile(client), listAreas(client)]);
        if (!active) return;
        if (isOnboarded(profile)) {
          router.replace("/home");
          return;
        }
        if (profile?.display_name && profile.display_name !== "dad") {
          setDisplayName(profile.display_name);
        }
        setAreas(areaRows);
      } catch {
        if (active) setError("Couldn't load your profile. Please refresh.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [client, router]);

  function next() {
    setError(undefined);
    if (step === 0 && !displayNameSchema.safeParse(displayName).success) {
      setError("Please enter your name (1–50 characters).");
      return;
    }
    if (step === 2 && bio.trim() && bioHasContactDetails(bio)) {
      setError("Please don't put phone numbers, emails, or links in your bio.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(undefined);
    setStep((s) => Math.max(0, s - 1));
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(undefined);
    try {
      const { body } = await processAvatar(file);
      setAvatarBody(body);
      setAvatarPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(new Blob([body], { type: "image/jpeg" }));
      });
    } catch {
      setError("Couldn't process that image. Try a different photo.");
    }
  }

  function useMyLocation() {
    setError(undefined);
    if (!navigator.geolocation) {
      setError("Location isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShareLocation(true);
      },
      () => setError("We couldn't get your location. You can skip this."),
    );
  }

  async function finish() {
    setError(undefined);
    setPending(true);
    try {
      await completeOnboarding(client, {
        displayName: displayName.trim(),
        parentingStage: parentingStage || null,
        areaId: areaId || null,
        bio: bio.trim() || undefined,
      });
      if (avatarBody) {
        await uploadAvatar(client, avatarBody, "image/jpeg");
      }
      // Only write a location row if the user actively opted in.
      if (shareLocation && coords) {
        await setMyLocation(client, coords);
      }
      router.replace("/home");
    } catch {
      setError("Couldn't save your profile. Please try again.");
      setPending(false);
    }
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-ink/50">loading…</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink/40">
          step {step + 1} of {STEPS.length}
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 && (
        <Field label="What should other dads call you?" htmlFor="displayName">
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus />
        </Field>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <Field label="Where are you (roughly)?" htmlFor="area" hint="Only your area is shown to others — never an exact location.">
            <Select id="area" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">Prefer not to say</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.region ? ` · ${a.region}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Your stage of fatherhood" htmlFor="stage">
            <Select
              id="stage"
              value={parentingStage}
              onChange={(e) => setParentingStage(e.target.value as ParentingStage | "")}
            >
              <option value="">Prefer not to say</option>
              {PARENTING_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      {step === 2 && (
        <Field
          label="A little about you (optional)"
          htmlFor="bio"
          hint="No phone numbers, emails, or links — keep it about you."
        >
          <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
        </Field>
      )}

      {step === 3 && (
        <div className="flex flex-col items-start gap-4">
          <p className="text-sm font-medium text-ink">Add a photo (optional)</p>
          {avatarPreview ? (
            <img src={avatarPreview} alt="Your avatar preview" className="h-28 w-28 rounded-full object-cover" />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-ink/5 text-ink/40">
              no photo
            </div>
          )}
          <input type="file" accept="image/*" onChange={onAvatarChange} className="text-sm text-ink/70" />
          <p className="text-xs text-ink/50">Location data is stripped from photos before upload.</p>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-ink">Share precise location? (optional)</p>
          <p className="text-xs text-ink/60">
            Off by default. Your exact location is never shown to other dads — it would only be used to
            find dads near you. You can change this anytime.
          </p>
          {shareLocation && coords ? (
            <p className="text-sm text-accent">Location captured. You can finish now.</p>
          ) : (
            <Button type="button" variant="ghost" onClick={useMyLocation}>
              Use my location
            </Button>
          )}
        </div>
      )}

      <FormError>{error}</FormError>

      <div className="flex gap-3">
        {step > 0 && (
          <Button type="button" variant="ghost" onClick={back} disabled={pending}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next} className="flex-1">
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={finish} disabled={pending} className="flex-1">
            {pending ? "Saving…" : "Finish"}
          </Button>
        )}
      </div>
    </main>
  );
}
