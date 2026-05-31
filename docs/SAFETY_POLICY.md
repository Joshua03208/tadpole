# Tadpole — Community, Safety & Crisis Policy

**Status: DRAFT for review.** This is an operational policy and product spec, not legal advice. It needs sign-off by someone qualified (and the legal documents — privacy policy, terms, DPIA — reviewed by a solicitor / data-protection specialist) before launch. Crisis helpline details were verified May 2026; re-verify before publishing.

---

## 1. What Tadpole is — and isn't

Tadpole connects fathers for **friendship, peer support, and local meet-ups**. It is explicitly **platonic** — not a dating app. The swipe/match mechanic is a discovery tool for finding other dads to talk to and meet, not for romance. This positioning must be unmistakable in onboarding, copy, and design, because the mechanic is borrowed from dating apps and will otherwise attract the wrong use and make users uncomfortable. (Bumble BFF and Peanut are the reference points: swipe mechanics, explicitly non-romantic.)

Tadpole is **not a medical, clinical, or crisis service.** It does not provide therapy, counselling, or emergency support. Where wellbeing content appears, it is general information and peer experience — never a substitute for professional care.

---

## 2. Eligibility

- **18+ only.** Given stranger-to-stranger contact, location sharing, and in-person meet-ups, the platform should be adults-only. This needs an age gate at sign-up and is a point to confirm with your legal reviewer (it affects the privacy policy, terms, and your safeguarding obligations).
- One account per person; real identity encouraged. Impersonation is prohibited.

---

## 3. Prohibited conduct

Users must not:
- Use Tadpole for dating, sexual, or romantic solicitation.
- Harass, bully, threaten, stalk, or intimidate anyone.
- Post hateful content targeting protected characteristics.
- Share sexual content, or any content sexualising or endangering children.
- Solicit money, run scams, spam, or promote unrelated commercial activity.
- Share others' private information without consent (doxxing).
- Impersonate others or misrepresent who they are.
- Encourage self-harm or suicide, or provide methods.
- Share illegal content or coordinate illegal activity.

Breaches lead to content removal, suspension, or permanent ban depending on severity (see §6).

---

## 4. Core safety features (build these in from launch)

These are **launch-blocking**, both for user safety and for App Store / Play Store approval of a stranger-contact app:

- **Block** — hides both users from each other everywhere (already in the data model: `blocks` table).
- **Unmatch** — ends a match and removes the chat (already in the data model: `unmatch()`).
- **Report** — on profiles, messages, and activities, with a reason category. Reports land in a moderation queue.
- **Photo / profile guidelines** — clear face photo, no contact details or solicitation in bios.
- **In-person safety guidance** — surfaced before a user's first arranged meet-up: meet in public, tell someone where you're going, bring kids only to suitable public venues, trust your instincts.
- **No precise location by default** — show coarse area; never expose exact coordinates or home location to other users.
- **Rate limits** on swipes, messages, and account creation to blunt abuse and spam.

---

## 5. Moderation process

- **Queue:** every report creates a moderation item with the reported content, reporter, and reason.
- **Triage by severity:**
  - *Immediate-risk* (threats, child-safety, credible self-harm/violence) → escalate immediately, act first, review after.
  - *Serious* (harassment, hate, scams, sexual solicitation) → review within a short SLA; remove + warn/suspend.
  - *Minor* (spam, off-topic, low-level rudeness) → review in normal queue.
- **Moderator roles:** the `moderator` and `admin` roles from the schema. Moderators can remove content, suspend, and ban; all actions are written to an **audit log** (who, what, when, why).
- **Child-safety content** is never handled informally: remove, preserve the minimum evidence required, ban, and report to the relevant authority (in the UK, this includes the NCA/CEOP and, for imagery, the IWF). Document this referral route with your legal reviewer.

---

## 6. Enforcement ladder

| Severity | Action |
|---|---|
| Minor / first offence | Warning + content removal |
| Repeated / serious | Temporary suspension |
| Severe (threats, hate, scams, sexual solicitation) | Permanent ban |
| Illegal / child-safety | Immediate ban + preservation + report to authorities |

- **Appeals:** users may appeal a suspension/ban through a simple form; a different moderator reviews where possible.
- **Transparency:** tell users (briefly) why action was taken, except where doing so would compromise a safety investigation.

---

## 7. Wellbeing content & crisis handling

This is the most sensitive surface and needs the most care.

**Principles**
- All wellbeing/parenting guidance is **general information**, clearly attributed, ideally authored or reviewed by a `verified_expert`. It carries a visible disclaimer that it is not medical advice.
- Tadpole does **not** offer crisis intervention. Staff and moderators are not counsellors and must not attempt to provide clinical support.

**When a user appears to be in crisis** (e.g. content suggesting suicidal intent or immediate danger):
- The product should make help **easy to reach** — a persistent "Get help now" link, and contextual signposting where wellbeing topics are discussed.
- Moderators encountering such content follow a documented protocol: respond with care, surface the resources below, do **not** attempt therapy, and escalate per the protocol. Where there is a credible, immediate risk to life, the protocol should direct contacting emergency services.
- Do **not** make promises about confidentiality or what will happen — signpost, don't guarantee.

**UK crisis resources to surface** (verified May 2026 — re-check before publishing):
- **Emergency / immediate danger:** call **999**.
- **Samaritans** — free, 24/7, for anyone in distress: **116 123**.
- **CALM** (Campaign Against Living Miserably — suicide-prevention, particularly relevant for men): **0800 58 58 58**, 5pm–midnight daily, plus webchat.
- **Shout** — free, confidential, 24/7 text support: text **SHOUT to 85258**.
- **NHS urgent mental health help (non-emergency):** call **111** and select the mental health option.

A men's-mental-health app should treat this signposting as a first-class feature, not fine print.

---

## 8. Data, records & privacy hooks

- Moderation actions, reports, and audit logs are personal data — covered by the privacy policy and subject to retention limits and DSAR/erasure (with a lawful-basis carve-out for safety records where appropriate; confirm with your reviewer).
- Use **soft deletes** so removed content can be preserved where a safety investigation or legal obligation requires, then purged on schedule.
- Keep safety/abuse records separable from general profile data so erasure requests can be honoured without destroying evidence you're obliged to keep.

---

## 9. Open items for your legal/safeguarding reviewer

1. Confirm **18+** and the age-assurance approach.
2. Confirm the **child-safety reporting route** (CEOP/NCA, IWF) and record-keeping duties.
3. Confirm lawful basis and retention for **safety/moderation records** vs. erasure rights.
4. Confirm duties under the UK **Online Safety Act** for a user-to-user service (illegal-content and safety duties may apply).
5. Sign off the **crisis protocol** wording with someone with safeguarding expertise.

---

*Companion documents to draft next: Privacy Policy, Terms of Service, and a DPIA — all needing the business/controller details and the inputs listed at the end of the main plan.*
