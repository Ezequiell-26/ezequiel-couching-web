/** @type {import('prettier').Config} */
export default {
  semi: true,
  singleQuote: false,
  doubleQuote: true,
  trailingComma: "es5",
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindFunctions: ["clsx", "cn", "cva"],
};
