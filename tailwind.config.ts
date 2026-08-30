import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#e8c46b",
          goldDark: "#a9720f",
          black: "#050403"
        }
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(120deg,#f6dc9a,#c9942f)"
      },
      fontFamily: {
        heading: ["'Playfair Display'", "Georgia", "serif"],
        label: ["Barlow", "sans-serif"],
        body: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
