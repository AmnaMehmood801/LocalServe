/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#f6f1ea",
          100: "#efe8de",
        },
        ink: "#0f172a",
        navy: {
          900: "#111827",
          950: "#0b1220",
        },
        teal: {
          50: "#e3f7ec",
          100: "#e3f7ec",
          600: "#1dbf73",
          700: "#19a463",
        },
      },
    },
  },
  plugins: [],
};
