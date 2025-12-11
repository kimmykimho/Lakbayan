/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#c77844',   // User's preferred brown
          dark: '#a85d30',      // Darker brown
          light: '#d9956a',     // Lighter brown
        },
        secondary: {
          DEFAULT: '#ffffff',
        },
        beige: {
          50: '#faf8f6',
          100: '#f5f1ed',
          200: '#ebe4dc',
          300: '#c8b6a6',
          400: '#c77844',
          500: '#c77844',
          600: '#a85d30',
          700: '#8B4513',
          800: '#6b3610',
          900: '#4a250c',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
