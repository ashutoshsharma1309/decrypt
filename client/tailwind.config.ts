import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        card: "#171717",
        border: "#262626",
        muted: "#a3a3a3",
        accent: {
          DEFAULT: "#a855f7",
          glow: "#c084fc",
        },
        success: "#22c55e",
        danger: "#ef4444",
        warning: "#eab308",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px -10px #a855f7" },
          "50%": { boxShadow: "0 0 32px -4px #a855f7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        glow: "glow 2.5s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, #1f1f1f 1px, transparent 1px), linear-gradient(to bottom, #1f1f1f 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(circle at 50% 0%, rgba(168,85,247,0.15), transparent 50%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
