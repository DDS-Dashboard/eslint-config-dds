/**
 * @dds/eslint-config — shared ESLint flat config for DDS TypeScript projects.
 *
 * Usage:
 *   import { base, react, convex, testing, customPlugins } from '@dds/eslint-config'
 *   import tseslint from 'typescript-eslint'
 *   import unusedImports from 'eslint-plugin-unused-imports'
 *   import importX from 'eslint-plugin-import-x'
 *
 *   export default [
 *     { ignores: ['dist/**', ...] },
 *     ...base({ tseslint, unusedImports, importX, tsconfigRootDir: import.meta.dirname }),
 *     ...react({ reactHooks, react }),
 *     ...convex(),
 *     ...testing({ vitest, testingLibrary }),
 *     ...customPlugins(),
 *   ]
 */

import stylistic from '@stylistic/eslint-plugin'

import localPlugin from './plugins/no-repeated-inline-types.mjs'
import declarationOrderPlugin from './plugins/declaration-order.mjs'

// ── Base TypeScript rules ───────────────────────────────────────────────────

/**
 * Core TypeScript config: recommended rules, type-aware linting, unused imports,
 * import hygiene, style rules, and restricted globals.
 */
export function base({ tseslint, unusedImports, importX, tsconfigRootDir, allowDefaultProject }) {
  return [
    ...tseslint.configs.recommended,

    {
      languageOptions: {
        parserOptions: {
          projectService: {
            ...(allowDefaultProject ? { allowDefaultProject } : {}),
          },
          tsconfigRootDir,
        },
      },
    },

    // Unused imports
    {
      plugins: { 'unused-imports': unusedImports },
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'warn',
          { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
        ],
      },
    },

    // High-signal correctness rules (type-aware)
    {
      rules: {
        '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
        '@typescript-eslint/consistent-type-exports': ['error', { fixMixedExportsWithInlineTypeSpecifier: true }],
        '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
        '@typescript-eslint/prefer-as-const': 'warn',
        '@typescript-eslint/prefer-readonly': 'warn',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-misused-promises': 'warn',
        '@typescript-eslint/switch-exhaustiveness-check': 'warn',
        '@typescript-eslint/no-unused-expressions': 'warn',
        '@typescript-eslint/no-unnecessary-condition': 'warn',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/require-await': 'warn',
        '@typescript-eslint/no-redundant-type-constituents': 'error',
        'func-style': ['error', 'declaration'],
        'prefer-arrow-callback': 'error',
        'prefer-const': ['error', { destructuring: 'any' }],
        'no-restricted-globals': [
          'error',
          { name: 'close', message: 'Use a more specific method instead of the global close()' },
          { name: 'open', message: 'Use window.open() explicitly or a more specific method' },
          { name: 'alert', message: 'Use a proper notification system instead of alert()' },
          { name: 'confirm', message: 'Use a proper confirmation dialog instead of confirm()' },
          { name: 'prompt', message: 'Use a proper input dialog instead of prompt()' },
          { name: 'event', message: 'Use the event parameter passed to your handler instead of the global event' },
          { name: 'length', message: 'The global length property is confusing, use a more specific property' },
          { name: 'name', message: 'The global name property is confusing, use a more specific property' },
          { name: 'status', message: 'Use window.status explicitly or a more specific property' },
          { name: 'top', message: 'Use window.top explicitly or a more specific property' },
          { name: 'parent', message: 'Use window.parent explicitly or a more specific property' },
          { name: 'origin', message: 'Use window.origin explicitly' },
          { name: 'stop', message: 'Use window.stop() explicitly' },
          { name: 'print', message: 'Use window.print() explicitly' },
        ],
      },
    },

    // Import hygiene
    {
      plugins: { 'import-x': importX },
      rules: {
        'import-x/no-self-import': 'error',
        'import-x/no-duplicates': 'error',
        'import-x/order': ['warn', {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        }],
      },
    },

    // Style rules
    {
      plugins: { '@stylistic': stylistic },
      rules: {
        '@stylistic/brace-style': ['warn', '1tbs'],
        'curly': ['warn', 'all'],
        '@stylistic/padding-line-between-statements': [
          'warn',

          // Require blank line before return statements.
          // Before:  const x = 1
          //          return x
          // After:   const x = 1
          //
          //          return x
          { blankLine: 'always', prev: '*', next: 'return' },

          // Require blank line after variable declarations to separate setup from logic.
          // Before:  const x = 1
          //          doSomething(x)
          // After:   const x = 1
          //
          //          doSomething(x)
          { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },

          // Allow consecutive variable declarations to stay grouped without blank lines.
          // OK:      const x = 1
          //          const y = 2
          //          const z = 3
          { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },

          // Require blank line after if blocks to separate guard clauses from logic.
          // Before:  if (!x) { return }
          //          doSomething()
          // After:   if (!x) { return }
          //
          //          doSomething()
          { blankLine: 'always', prev: 'if', next: '*' },

          // Require blank line before try blocks.
          // Before:  doSomething()
          //          try {
          // After:   doSomething()
          //
          //          try {
          { blankLine: 'always', prev: '*', next: 'try' },

          // Require blank line between function declarations.
          // Before:  function foo() {}
          //          function bar() {}
          // After:   function foo() {}
          //
          //          function bar() {}
          { blankLine: 'always', prev: 'function', next: 'function' },
        ],
      },
    },

    // Disable type-checked rules for JS config files
    {
      files: ['**/*.mjs', '**/*.js'],
      ...tseslint.configs.disableTypeChecked,
    },
  ]
}

// ── React ───────────────────────────────────────────────────────────────────

/**
 * React rules: hooks, JSX correctness, no-console in UI code.
 *
 * @param {object} opts
 * @param {object} [opts.reactHooks] - eslint-plugin-react-hooks
 * @param {object} [opts.react] - eslint-plugin-react
 * @param {string[]} [opts.componentFiles] - Glob patterns for React files
 * @param {string[]} [opts.noConsoleFiles] - Glob patterns where console.log is banned
 */
export function react({ reactHooks, react, componentFiles, noConsoleFiles } = {}) {
  const compFiles = componentFiles ?? ['src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}']
  const jsxFiles = componentFiles ?? ['src/**/*.{tsx,jsx}', 'packages/*/src/**/*.{tsx,jsx}']
  const consoleFiles = noConsoleFiles ?? [
    'src/components/**/*.{ts,tsx}',
    'src/pages/**/*.{ts,tsx}',
    'src/routes/**/*.{ts,tsx}',
    'packages/*/src/**/*.{ts,tsx}',
  ]

  const configs = []

  if (reactHooks) {
    configs.push({
      files: compFiles,
      plugins: { 'react-hooks': reactHooks },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/refs': 'warn',
        'react-hooks/set-state-in-effect': 'warn',
      },
    })
  }

  if (react) {
    configs.push({
      files: jsxFiles,
      plugins: { react },
      rules: {
        'react/jsx-key': 'error',
        'react/jsx-no-target-blank': 'error',
        'react/no-children-prop': 'warn',
        'no-restricted-syntax': ['error',
          {
            selector: "LogicalExpression[operator='&&'][right.type='JSXElement']",
            message: 'Use ternary (`condition ? <Foo /> : null`) instead of `&&` for conditional rendering',
          },
          {
            selector: "LogicalExpression[operator='&&'][right.type='JSXFragment']",
            message: 'Use ternary (`condition ? <Foo /> : null`) instead of `&&` for conditional rendering',
          },
        ],
      },
      settings: { react: { version: 'detect' } },
    })
  }

  configs.push({
    files: consoleFiles,
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  })

  return configs
}

// ─��� Convex ──────────────────────────────────────��───────────────────────────

/**
 * Convex backend relaxations: turns off no-unsafe-* rules since Convex's
 * action API (ctx.runQuery/runMutation/runAction) returns any by design.
 */
export function convex({ files } = {}) {
  return [
    {
      files: files ?? ['convex/**/*.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unnecessary-condition': 'off',
      },
    },
  ]
}

// ── Testing ─────────────────────��───────────────────────────────────────────

/**
 * Test file config: vitest rules, testing-library rules, relaxed no-unsafe-*.
 */
export function testing({ vitest, testingLibrary, testFiles, testingLibraryFiles } = {}) {
  const tFiles = testFiles ?? [
    'tests/**/*.{ts,tsx}',
    'packages/*/__tests__/**/*.{ts,tsx}',
    'packages/*/src/**/*.test.{ts,tsx}',
  ]
  const tlFiles = testingLibraryFiles ?? ['tests/**/*.{ts,tsx}']

  const configs = []

  configs.push({
    files: tFiles,
    ...(vitest ? { plugins: { vitest } } : {}),
    rules: {
      ...(vitest ? vitest.configs.recommended.rules : {}),
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  })

  if (testingLibrary) {
    configs.push({
      files: tlFiles,
      plugins: { 'testing-library': testingLibrary },
      rules: {
        ...testingLibrary.configs['flat/react'].rules,
        'testing-library/no-node-access': 'off',
        'testing-library/no-manual-cleanup': 'off',
      },
    })
  }

  return configs
}

// ── Custom plugins ──────────────────────────────────────────────────────────

/**
 * DDS custom ESLint plugins (no-repeated-inline-types).
 */
export function customPlugins({ files } = {}) {
  const targetFiles = files ?? ['src/**/*.{ts,tsx}', 'convex/**/*.ts', 'packages/*/src/**/*.{ts,tsx}']

  return [
    {
      files: targetFiles,
      plugins: { '@dds': { rules: { ...localPlugin.rules, ...declarationOrderPlugin.rules } } },
      rules: {
        '@dds/no-repeated-inline-types': 'warn',
        '@dds/declaration-order': 'warn',
      },
    },
  ]
}
