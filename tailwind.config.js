/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        foreground: "#e0e0e0",
        card: "rgba(255, 255, 255, 0.03)",
        "neon-cyan": "#06b6d4",
        "neon-magenta": "#d946ef",
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(6, 182, 212, 0.1)',
        'neon-magenta': '0 0 15px rgba(217, 70, 239, 0.1)',
      }
    },
  },
  plugins: [],
}
