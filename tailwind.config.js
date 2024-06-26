const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // You can add more colors here.
        sky: colors.sky,
        rose: colors.rose,
        teal: colors.teal,
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
