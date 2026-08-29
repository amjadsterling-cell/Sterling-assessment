import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#ed1f51",
          orange: "#f05825",
          black: "#050408"
        }
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(120deg,#ed1f51,#f05825)"
      },
      fontFamily: {
        heading: ["Montserrat", "sans-serif"],
        label: ["Barlow", "sans-serif"],
        body: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
