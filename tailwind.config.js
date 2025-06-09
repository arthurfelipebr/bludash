/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./{App,index,Auth}.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./features/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'blu': {
          'primary': '#3A4DFF',
          'accent': '#A4A5FF',
        }
      }
    },
  },
  plugins: [],
}
