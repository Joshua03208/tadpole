/**
 * Tadpole shared Tailwind v3 token preset — the single source of brand truth,
 * consumed by BOTH Tailwind (apps/web) and NativeWind (apps/mobile) so the
 * brand is pixel-identical across platforms. There is NO shared UI component
 * layer (CLAUDE.md): only these tokens are shared.
 *
 * CommonJS on purpose so both Next's tailwind.config.ts and Expo's
 * tailwind.config.js can `require()` it without ESM-interop pain.
 *
 * Colours use the `rgb(var(--token) / <alpha-value>)` channel pattern so each
 * colour is a SINGLE swappable CSS variable (CLAUDE.md: "leave a single token
 * --accent for later") AND Tailwind opacity modifiers (e.g. text-ink/70) work.
 * Each app declares the channel variables (space-separated RGB) in its global
 * stylesheet.
 *
 * Locked brand decisions (docs/TADPOLE_PLAN.md §13):
 *   --bg     242 239 232  (#F2EFE8) warm cream — background/surfaces
 *   --ink    0 0 0        (#000000) ink — wordmark, primary text, headings
 *   --accent 62 124 90    (#3E7C5A) muted pond-green — buttons, links, matches
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
        },
        // Standard UI states. Placeholder values — tune against the brand later.
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        error: "rgb(var(--error) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
