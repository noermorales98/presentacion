/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // La presentación se dibuja en un lienzo fijo de 1600×900 que se escala a
    // cualquier pantalla (ver useStageScale en PresentPage). Los puntos de
    // quiebre responden al viewport y romperían ese lienzo en móvil, así que
    // se fijan al mínimo: TODO el layout usa siempre el diseño de escritorio
    // y el escenario lo reduce proporcionalmente.
    screens: {
      sm: "1px",
      md: "2px",
      lg: "3px",
      xl: "4px",
      "2xl": "5px",
    },
    extend: {
      colors: {
        ink: "#0B0B18",        // fondo principal Noxy
        bone: "#F2EDE3",       // texto principal
        volt: "#2F5BFF",       // azul eléctrico
        lime: "#B6FF3B",       // verde lima
        smoke: "#A6A6BE",      // gris secundario (más visible sobre el grano)
        line: "rgba(242,237,227,0.14)",
        panel: "#11111F",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        // títulos: Open Sauce Two en peso 400 (regla global en index.css)
        grotesk: ["'Open Sauce Two'", "system-ui", "sans-serif"],
        // texto general, datos, HUD y código: Open Sauce Sans
        mono: ["'Open Sauce Sans'", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        kicker: "0.28em",
      },
    },
  },
  plugins: [],
}
