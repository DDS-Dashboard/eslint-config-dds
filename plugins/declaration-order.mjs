/**
 * ESLint rule: declaration-order
 *
 * Enforces a configurable ordering of top-level declarations in a file.
 *
 * Categories:
 *   import          — import statements (always implicitly first)
 *   export-function — exported function declarations
 *   export-const    — exported variable declarations
 *   export-type     — exported type/interface declarations and type re-exports
 *   local-function  — non-exported function declarations
 *   local-const     — non-exported variable declarations
 *   local-type      — non-exported type/interface declarations
 *
 * Default order:
 *   [export-function, export-const, export-type, local-function, local-const, local-type]
 */

const CATEGORIES = [
  'export-function',
  'export-const',
  'export-type',
  'local-function',
  'local-const',
  'local-type',
]

const DEFAULT_ORDER = [
  'export-function',
  'export-const',
  'export-type',
  'local-function',
  'local-const',
  'local-type',
]

function classify(stmt) {
  // Imports are handled separately — always first
  if (stmt.type === 'ImportDeclaration') return 'import'

  // Export default — classify by what's being exported
  if (stmt.type === 'ExportDefaultDeclaration') {
    const decl = stmt.declaration
    if (decl?.type === 'FunctionDeclaration') return 'export-function'
    if (decl?.type === 'TSTypeAliasDeclaration' || decl?.type === 'TSInterfaceDeclaration') {
      return 'export-type'
    }
    return 'export-const'
  }

  // Export named with a declaration
  if (stmt.type === 'ExportNamedDeclaration') {
    const decl = stmt.declaration
    if (decl) {
      if (decl.type === 'FunctionDeclaration') return 'export-function'
      if (decl.type === 'TSTypeAliasDeclaration' || decl.type === 'TSInterfaceDeclaration') {
        return 'export-type'
      }
      if (decl.type === 'VariableDeclaration') return 'export-const'
    }
    // `export { ... }` or `export type { ... } from '...'` — treat as type re-export if exportKind is 'type'
    if (stmt.exportKind === 'type') return 'export-type'
    // `export { ... }` (value re-export)
    return 'export-const'
  }

  // Export all: `export * from '...'`
  if (stmt.type === 'ExportAllDeclaration') {
    return stmt.exportKind === 'type' ? 'export-type' : 'export-const'
  }

  // Non-exported declarations
  if (stmt.type === 'FunctionDeclaration') return 'local-function'
  if (stmt.type === 'VariableDeclaration') return 'local-const'
  if (stmt.type === 'TSTypeAliasDeclaration' || stmt.type === 'TSInterfaceDeclaration') {
    return 'local-type'
  }

  // Anything else (expression statements, etc.) — treat as local-const
  return 'local-const'
}

function stmtName(stmt) {
  // Unwrap export wrapper
  const decl =
    (stmt.type === 'ExportNamedDeclaration' || stmt.type === 'ExportDefaultDeclaration') &&
    stmt.declaration
      ? stmt.declaration
      : stmt

  if (decl.id?.name) return decl.id.name

  // Variable declarations
  if (decl.type === 'VariableDeclaration' && decl.declarations?.[0]) {
    const d = decl.declarations[0]
    if (d.id?.type === 'Identifier') return d.id.name
    if (d.id?.type === 'ObjectPattern') {
      return (
        '{ ' + d.id.properties.map((p) => p.value?.name ?? p.key?.name ?? '?').join(', ') + ' }'
      )
    }
    return '<destructured>'
  }

  // Re-exports
  if (stmt.type === 'ExportNamedDeclaration' && stmt.specifiers?.length) {
    return stmt.specifiers.map((s) => s.exported?.name ?? '?').join(', ')
  }

  return '<unknown>'
}

const CATEGORY_LABELS = {
  'export-function': 'exported functions',
  'export-const': 'exported constants',
  'export-type': 'exported types',
  'local-function': 'local functions',
  'local-const': 'local constants',
  'local-type': 'local types',
}

export const declarationOrder = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce a consistent ordering of top-level declarations',
    },
    messages: {
      outOfOrder:
        '"{{ name }}" ({{ actualLabel }}) should appear before {{ expectedLabel }}.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          order: {
            type: 'array',
            items: { type: 'string', enum: CATEGORIES },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const order = context.options[0]?.order ?? DEFAULT_ORDER

    // Build a rank map: category → position number
    const rank = new Map()
    order.forEach((cat, i) => rank.set(cat, i))

    return {
      'Program:exit'(programNode) {
        const body = programNode.body

        let highestRank = -1
        let highestCategory = null

        for (const stmt of body) {
          const cat = classify(stmt)
          if (cat === 'import') continue

          const r = rank.get(cat)
          if (r === undefined) continue // unknown category, skip

          if (r < highestRank) {
            context.report({
              node: stmt,
              messageId: 'outOfOrder',
              data: {
                name: stmtName(stmt),
                actualLabel: CATEGORY_LABELS[cat] ?? cat,
                expectedLabel: CATEGORY_LABELS[highestCategory] ?? highestCategory,
              },
            })
          } else {
            highestRank = r
            highestCategory = cat
          }
        }
      },
    }
  },
}

export default {
  rules: {
    'declaration-order': declarationOrder,
  },
}
