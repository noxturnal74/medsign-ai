/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        info: "var(--info)",
        "info-foreground": "var(--info-foreground)",
        success: "var(--success)",
        "success-foreground": "var(--success-foreground)",
        warning: "var(--warning)",
        "warning-foreground": "var(--warning-foreground)",
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        medical: {
          dark: '#020b14',
          slate: '#0f172a',
          navy: '#1e3a8a',
          cyan: '#0ea5e9',
          teal: '#0d9488',
          emerald: '#10b981',
          crimson: '#ef4444',
          danger: '#b91c1c'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['DM Serif Text', 'serif']
      }
    },
  },
  plugins: [],
}
