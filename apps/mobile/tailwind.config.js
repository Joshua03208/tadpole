const preset = require("@tadpole/config/tailwind");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "../../packages/**/*.{ts,tsx}"],
  // NativeWind's preset MUST come first; the Tadpole brand tokens layer on top.
  presets: [require("nativewind/preset"), preset],
  theme: { extend: {} },
  plugins: [],
};
