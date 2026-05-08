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
    fixable: 'code',
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
    const sourceCode = context.sourceCode ?? context.getSourceCode()

    const rank = new Map()
    order.forEach((cat, i) => rank.set(cat, i))

    // Range of a statement including its leading comments and any trailing
    // comments on the same line (e.g. `const x = 1 // foo`). A comment between
    // two statements is returned by both getCommentsAfter(prev) and
    // getCommentsBefore(next), so we drop leading comments that sit on the
    // same line as the previous statement's end (those belong to prev).
    function blockRange(stmt, prevStmt) {
      const leading = sourceCode.getCommentsBefore(stmt)
      const trailing = sourceCode.getCommentsAfter(stmt)
      let start = stmt.range[0]
      let end = stmt.range[1]
      const prevEndLine = prevStmt?.loc.end.line ?? -1
      const firstLeading = leading.find((c) => c.loc.start.line !== prevEndLine)
      if (firstLeading) start = firstLeading.range[0]
      for (const c of trailing) {
        if (c.loc.start.line === stmt.loc.end.line) {
          end = Math.max(end, c.range[1])
        } else break
      }
      return [start, end]
    }

    return {
      'Program:exit'(programNode) {
        const body = programNode.body

        const items = []
        for (let i = 0; i < body.length; i++) {
          const stmt = body[i]
          const cat = classify(stmt)
          if (cat === 'import') continue
          const r = rank.get(cat)
          if (r === undefined) continue
          items.push({ stmt, cat, r, originalIdx: i })
        }

        if (items.length < 2) return

        const offenders = []
        let highestRank = -1
        let highestCategory = null
        for (const item of items) {
          if (item.r < highestRank) {
            offenders.push({ ...item, expectedCategory: highestCategory })
          } else {
            highestRank = item.r
            highestCategory = item.cat
          }
        }

        if (offenders.length === 0) return

        // Single fix that re-sorts all categorized top-level statements.
        const sorted = items
          .map((it, i) => ({ ...it, stableIdx: i }))
          .sort((a, b) => (a.r - b.r) || (a.stableIdx - b.stableIdx))

        const segments = items.map((it) => {
          const prevStmt = it.originalIdx > 0 ? body[it.originalIdx - 1] : null
          const [start, end] = blockRange(it.stmt, prevStmt)
          return { originalIdx: it.originalIdx, start, end, text: sourceCode.text.slice(start, end) }
        })
        const segmentByIdx = new Map(segments.map((s) => [s.originalIdx, s]))

        const replaceStart = segments[0].start
        const replaceEnd = segments[segments.length - 1].end
        const newText = sorted.map((it) => segmentByIdx.get(it.originalIdx).text).join('\n\n')

        const fix = (fixer) => fixer.replaceTextRange([replaceStart, replaceEnd], newText)

        for (let i = 0; i < offenders.length; i++) {
          const o = offenders[i]
          context.report({
            node: o.stmt,
            messageId: 'outOfOrder',
            data: {
              name: stmtName(o.stmt),
              actualLabel: CATEGORY_LABELS[o.cat] ?? o.cat,
              expectedLabel: CATEGORY_LABELS[o.expectedCategory] ?? o.expectedCategory,
            },
            // Attach the fix to only the first offender — overlapping fixes
            // would otherwise be discarded by ESLint's fixer.
            fix: i === 0 ? fix : undefined,
          })
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
