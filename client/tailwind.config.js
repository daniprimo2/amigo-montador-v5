/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f9fafb",          // cor exemplo
        foreground: "#111827",
        border: "#e5e7eb",
        "muted": "#f5f5f5",              // cor clara para muted (exemplo)
        "muted-foreground": "#6b7280",   // cinza médio, usado no placeholder
        "card": "#ffffff",
        "card-foreground": "#000000",
        "primary": "#000000",
        "primary-foreground": "#ffffff",
        "secondary": "#e5e7eb",
        "secondary-foreground": "#000000",
        "accent": "#f0f0f0",
        "accent-foreground": "#000000",
        "destructive": "#dc2626",
        "destructive-foreground": "#ffffff",
        "ring": "#000000",
        "success": "#22c55e",
        "success-foreground": "#ffffff",
        "warning": "#facc15",
        "warning-foreground": "#78350f",
        "info": "#f0f9ff",
        "info-foreground": "#000000",
      },
    },
  },
  plugins: [],
};
