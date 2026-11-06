/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        foreground: '#f1f5f9',
        card: {
          bg: '#0e1424',
          border: '#1e293b',
        },
        accent: {
          teal: '#14b8a6',
          cyan: '#06b6d4',
        },
        positive: '#10b981',
        negative: '#f43f5e',
      },
    },
  },
  plugins: [],
}
