/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'radar-dark': '#0f172a',
        'radar-card': '#1e293b',
        'radar-accent': '#3b82f6',
      }
    },
  },
  plugins: [],
}
