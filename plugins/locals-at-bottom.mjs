/**
 * ESLint rule: locals-at-bottom
 *
 * Enforces that non-exported variable declarations (local constants)
 * appear after all exported declarations and function declarations,
 * but before type declarations.
 *
 * Desired file order:
 *   1. Imports
 *   2. Exported declarations, function declarations (primary code)
 *   3. Non-exported variable declarations (local constants)
 *   4. Type/interface declarations (enforced by types-at-bottom)
 */

export const localsAtBottom = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce non-exported variable declarations after exports and functions, before types',
    },
    messages: {
      localsAtBottom:
        'Local constant "{{ name }}" should be declared after all exports and function declarations.',
    },
    schema: [],
  },

  create(context) {
    return {
      'Program:exit'(programNode) {
        const body = programNode.body

        function isImport(stmt) {
          return stmt.type === 'ImportDeclaration'
        }

        function isTypeDecl(stmt) {
          if (stmt.type === 'TSTypeAliasDeclaration' || stmt.type === 'TSInterfaceDeclaration') {
            return true
          }
          if (
            stmt.type === 'ExportNamedDeclaration' &&
            stmt.declaration &&
            (stmt.declaration.type === 'TSTypeAliasDeclaration' ||
              stmt.declaration.type === 'TSInterfaceDeclaration')
          ) {
            return true
          }
          return false
        }

        function isLocalVar(stmt) {
          return stmt.type === 'VariableDeclaration'
        }

        function localVarName(stmt) {
          const decl = stmt.declarations?.[0]
          if (!decl) return '<unknown>'
          if (decl.id?.type === 'Identifier') return decl.id.name
          if (decl.id?.type === 'ObjectPattern') {
            const props = decl.id.properties
              .map((p) => p.value?.name ?? p.key?.name ?? '?')
              .join(', ')
            return `{ ${props} }`
          }
          return '<destructured>'
        }

        // "Primary" = anything that isn't an import, type, or local variable declaration
        function isPrimary(stmt) {
          return !isImport(stmt) && !isTypeDecl(stmt) && !isLocalVar(stmt)
        }

        // Find the last primary statement
        let lastPrimaryIndex = -1
        for (let i = body.length - 1; i >= 0; i--) {
          if (isPrimary(body[i])) {
            lastPrimaryIndex = i
            break
          }
        }

        if (lastPrimaryIndex === -1) return

        // Flag local variable declarations that appear before the last primary statement
        for (let i = 0; i < lastPrimaryIndex; i++) {
          if (isLocalVar(body[i])) {
            context.report({
              node: body[i],
              messageId: 'localsAtBottom',
              data: { name: localVarName(body[i]) },
            })
          }
        }
      },
    }
  },
}

export default {
  rules: {
    'locals-at-bottom': localsAtBottom,
  },
}
