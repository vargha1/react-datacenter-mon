/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary1: "var(--color-primary-1)",
        secondary1: "var(--color-secondary-1)",
        text: "var(--color-text)",
        success: "var(--color-success)",
        warn: "var(--color-warn)",
        error: "var(--color-error)",
      },
    },
  },
  plugins: [],
};
