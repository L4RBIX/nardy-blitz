import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        /* DM Sans — unified product sans-serif across all pages */
        sans:  ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        /* JetBrains Mono — scores, metrics, move history, technical labels */
        mono:  ["var(--font-jetbrains)", "Menlo", "monospace"],
      },
      colors: {
        gold:        "var(--gold)",
        "gold-bright": "var(--gold-bright)",
        felt:        "var(--felt-base)",
        navy:        "var(--bg-base)",
        surface:     "var(--bg-surface)",
        raised:      "var(--bg-raised)",
        card:        "var(--bg-card)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        gold:    "var(--border-gold)",
        green:   "var(--border-green)",
      },
      transitionTimingFunction: {
        expo: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
