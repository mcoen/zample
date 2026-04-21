import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Avenir Next", "Nunito Sans", "Segoe UI", "sans-serif"],
        mono: ["SF Mono", "Menlo", "Consolas", "monospace"]
      },
      boxShadow: {
        halo: "0 0 0 1px rgba(124, 166, 255, 0.18), 0 16px 60px rgba(8, 20, 56, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
