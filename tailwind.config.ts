import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./modules/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#f6f7f9",
        foreground: "#18202a",
        surface: "#ffffff",
        border: "#d9dee7",
        muted: "#667085",
        primary: "#164f63",
        accent: "#b8892d",
        success: "#287a4b",
        danger: "#b42318"
      }
    }
  },
  plugins: []
};

export default config;
