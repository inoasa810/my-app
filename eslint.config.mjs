import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // 共通設定
  {
    ignores: ["node_modules/**"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script", // CommonJS の場合は "script"、ESM の場合は "module"
      globals: globals.node // Node 環境のグローバルを有効にする
    },
    settings: {},
    rules: {}
  },

  // JS ファイル用ルール（@eslint/js の recommended を適用）
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: globals.node
    },
    env: { node: true, browser: false }
  }
]);
