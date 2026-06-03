/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#020617',
          dark: '#0f172a',
          accent: '#DFFF00',
          live: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}