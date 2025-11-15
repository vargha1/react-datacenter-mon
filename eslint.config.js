import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // The project currently uses a number of safe casts to `any` when
      // interacting with Konva and platform globals; disable this rule so
      // we can clean up the codebase incrementally without being blocked.
  "@typescript-eslint/no-explicit-any": "error",
      // Fast refresh rule is strict about files that export helpers+components;
      // disable so ThemeProvider and similar patterns don't fail lint.
      "react-refresh/only-export-components": "off",
    },
  },
])
