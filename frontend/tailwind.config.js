/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        secondary: 'var(--text-secondary)',
        container: 'var(--container-bg)',
        custom: 'var(--border-color)',
      },
      boxShadow: {
        card: 'var(--shadow)',
        'card-hover': 'var(--shadow-hover)',
      },
    },
  },
  plugins: [],
}
