/**
 * ESLint rule: types-at-bottom
 *
 * Enforces that type and interface declarations appear after all
 * non-type, non-import top-level statements in a file.
 */

export const typesAtBottom = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce type/interface declarations at the bottom of files',
    },
    messages: {
      typesAtBottom:
        'Type "{{ name }}" should be declared at the bottom of the file, after all function and variable declarations.',
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

        function typeName(stmt) {
          const decl = stmt.type === 'ExportNamedDeclaration' ? stmt.declaration : stmt
          return decl.id?.name ?? '<anonymous>'
        }

        // Find the last non-import, non-type statement
        let lastNonTypeIndex = -1
        for (let i = body.length - 1; i >= 0; i--) {
          if (!isImport(body[i]) && !isTypeDecl(body[i])) {
            lastNonTypeIndex = i
            break
          }
        }

        if (lastNonTypeIndex === -1) return

        // Flag type declarations that appear before the last non-type statement
        for (let i = 0; i < lastNonTypeIndex; i++) {
          if (isTypeDecl(body[i])) {
            context.report({
              node: body[i],
              messageId: 'typesAtBottom',
              data: { name: typeName(body[i]) },
            })
          }
        }
      },
    }
  },
}

export default {
  rules: {
    'types-at-bottom': typesAtBottom,
  },
}
