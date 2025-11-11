/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pastel1: "#FCE7F3",
        pastel2: "#E0F2FE",
        pastel3: "#FEF3C7",
        pastel4: "#DCFCE7",
      },
    },
  },
  plugins: [],
};
