/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wartsila-black': '#3B3D3F',
        'wartsila-blue':  '#00A1E0',
      },
    },
  },
  plugins: [],
}
