import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#050812",
        panel: "rgba(12, 19, 35, 0.72)",
        neonBlue: "#23c9ff",
        neonGreen: "#35ff9f",
        alertRed: "#ff476f",
        signalYellow: "#ffd166"
      },
      boxShadow: {
        neon: "0 0 28px rgba(35, 201, 255, 0.22)",
        green: "0 0 24px rgba(53, 255, 159, 0.2)"
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"]
      }
    }
  },
  plugins: []
} satisfies Config;
