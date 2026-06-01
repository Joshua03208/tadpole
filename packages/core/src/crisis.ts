// UK crisis resources (SAFETY_POLICY.md §7). First-class signposting, not fine
// print. Tadpole is NOT a crisis service — this only points to real help.
// Verified May 2026 — RE-VERIFY before public launch.

export type CrisisResource = {
  name: string;
  detail: string;
  /** tel: number for call, or sms: target for text. */
  action: { kind: "call"; number: string } | { kind: "text"; to: string; body: string };
  emphasis?: boolean;
};

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "Emergency",
    detail: "If you or someone else is in immediate danger.",
    action: { kind: "call", number: "999" },
    emphasis: true,
  },
  {
    name: "Samaritans",
    detail: "Free, 24/7, for anyone in distress.",
    action: { kind: "call", number: "116123" },
  },
  {
    name: "CALM",
    detail: "Campaign Against Living Miserably — for men. 5pm–midnight daily.",
    action: { kind: "call", number: "0800585858" },
  },
  {
    name: "Shout",
    detail: "Free, confidential, 24/7 text support — text SHOUT to 85258.",
    action: { kind: "text", to: "85258", body: "SHOUT" },
  },
  {
    name: "NHS 111",
    detail: "Urgent (non-emergency) mental health help — call and select the mental health option.",
    action: { kind: "call", number: "111" },
  },
];
