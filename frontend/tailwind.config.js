/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./crowd/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: { 950: '#0A0D12', 900: '#F7F9FB', 800: '#FFFFFF', 700: '#F1F4F7', 600: '#E7EBEF', border: '#DDE3E9' },
        ink: { DEFAULT: '#111827', muted: '#586573', faint: '#8B96A2' },
        signal: { DEFAULT: '#0F766E', dim: '#0B5B54', soft: 'rgba(15, 118, 110, 0.12)' },
        amber: { DEFAULT: '#B45309', soft: 'rgba(180, 83, 9, 0.12)' },
        alert: { DEFAULT: '#DC2626', soft: 'rgba(220, 38, 38, 0.10)' },
        cyber: {
          dark: '#0a0d14',
          card: '#111726',
          border: '#1e293b',
          accent: '#06b6d4',
          danger: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}