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
          50: '#F1F8F3',
          100: '#E3F1E7',
          200: '#C8E6C9',
          300: '#B7DCC1',
          400: '#66A97B',
          500: '#2E7D32',
          600: '#1B6B3A',
          700: '#145A30',
          800: '#0F4624',
          900: '#0A3319',
        },
        accent: {
          50: '#E6F5F6',
          100: '#CCEBED',
          500: '#0E7C86',
          600: '#0B6A73',
          700: '#095760',
        },
        ink: {
          300: '#8FB59B',
          500: '#5F8A6D',
          700: '#345A44',
          900: '#1F3D2B',
        },
        surface: {
          white: '#FFFFFF',
          mist: '#F7FBF8',
          line: '#CFE5D5',
        },
        mist: '#F7FBF8',
        line: '#CFE5D5',
        warning: {
          DEFAULT: '#B7791F',
          bg: '#FDF6E3',
        },
        danger: {
          DEFAULT: '#B42318',
          bg: '#FDECEA',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

