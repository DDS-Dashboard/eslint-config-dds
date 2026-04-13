# @dds/eslint-config

Shared [ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files) for DDS TypeScript projects. Provides opinionated, composable config layers for TypeScript, React, Convex, and testing.

## Install

```sh
npm install @dds/eslint-config eslint typescript-eslint eslint-plugin-unused-imports eslint-plugin-import-x
```

Optional peer dependencies (install only what you need):

```sh
# React
npm install eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-you-might-not-need-an-effect

# Testing
npm install @vitest/eslint-plugin eslint-plugin-testing-library
```

## Usage

Create an `eslint.config.mjs` in your project root:

```js
import tseslint from 'typescript-eslint'
import unusedImports from 'eslint-plugin-unused-imports'
import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import react from 'eslint-plugin-react'
import reactYouMightNotNeedAnEffect from 'eslint-plugin-react-you-might-not-need-an-effect'
import vitest from '@vitest/eslint-plugin'
import testingLibrary from 'eslint-plugin-testing-library'
import { base, react as reactConfig, convex, testing, customPlugins } from '@dds/eslint-config'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  ...base({ tseslint, unusedImports, importX, tsconfigRootDir: import.meta.dirname }),
  ...reactConfig({ reactHooks, react, reactYouMightNotNeedAnEffect }),
  ...convex(),
  ...testing({ vitest, testingLibrary }),
  ...customPlugins(),
]
```

## Config layers

Each export is a function that returns an array of flat config objects. Use only the layers you need.

### `base({ tseslint, unusedImports, importX, tsconfigRootDir, allowDefaultProject? })`

Core TypeScript config. Includes `typescript-eslint` recommended rules, type-aware linting, unused import removal, import hygiene, `consistent-type-imports`, `func-style`, restricted globals, and more. Automatically disables type-checked rules for `.mjs`/`.js` files.

**Required** for all projects.

### `react({ reactHooks?, react?, reactYouMightNotNeedAnEffect?, componentFiles?, noConsoleFiles? })`

React hooks rules, `react-you-might-not-need-an-effect` recommended warnings, JSX correctness, and `no-console` in UI code. All plugin arguments are optional — only the plugins you pass are activated.

- `componentFiles` — globs for React source files (default: `src/**/*.{ts,tsx}`)
- `noConsoleFiles` — globs where `console.log` is banned (default: `src/components/**`, `src/pages/**`, `src/routes/**`)

### `convex({ files? })`

Relaxes `no-unsafe-*` rules for Convex backend files (`convex/**/*.ts`) since Convex's action API returns `any` by design.

### `testing({ vitest?, testingLibrary?, testFiles?, testingLibraryFiles? })`

Test file config: vitest recommended rules, testing-library rules, and relaxed `no-unsafe-*`. Both plugin arguments are optional.

### `customPlugins({ files? })`

DDS custom ESLint plugins. Currently includes `@dds/no-repeated-inline-types`, which flags inline union types (3+ members) that appear in multiple files and should be extracted to a named type alias.

## Minimal example (TypeScript only, no React)

```js
import tseslint from 'typescript-eslint'
import unusedImports from 'eslint-plugin-unused-imports'
import importX from 'eslint-plugin-import-x'
import { base, customPlugins } from '@dds/eslint-config'

export default [
  { ignores: ['dist/**'] },
  ...base({ tseslint, unusedImports, importX, tsconfigRootDir: import.meta.dirname }),
  ...customPlugins(),
]
```
