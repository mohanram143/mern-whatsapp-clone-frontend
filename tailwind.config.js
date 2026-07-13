/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        green: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },
        // Authentic WhatsApp palette
        wa: {
          teal: "#00A884",
          tealDark: "#008069",
          tealDeep: "#005C4B",
          green: "#25D366",
          panelDark: "#202C33",
          panelDarkHover: "#2A3942",
          bgDark: "#0B141A",
          bgChatDark: "#0B141A",
          bubbleOutDark: "#005C4B",
          bubbleInDark: "#202C33",
          bgLight: "#F0F2F5",
          bgChatLight: "#EFEAE2",
          bubbleOutLight: "#D9FDD3",
          bubbleInLight: "#FFFFFF",
          tick: "#53BDEB",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "scale-in": "scaleIn 0.15s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: 0, transform: "translateY(16px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: 0, transform: "scale(0.95)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
