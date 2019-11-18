module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true
  },
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly"
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  extends: ["eslint:recommended", "prettier"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    //Add Custom ESLint linting rules here, add/remove, disable/enable as your team agreed upon
    "strict": ["error", "global"],
    "no-var": "error",
    "no-console": "off",
    "no-unused-vars": "warn",
    "quotes": ["error", "single", { "avoidEscape": true }],
  }
};
