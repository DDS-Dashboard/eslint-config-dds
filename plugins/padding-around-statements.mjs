/**
 * ESLint rule: padding-around-statements
 *
 * Requires blank lines before and after statements that warrant visual
 * separation from surrounding code:
 *
 *   - await expression statements
 *   - toast.* call statements
 *
 * Before:  captureException(e)
 *          toast.error('Failed')
 *
 * After:   captureException(e)
 *
 *          toast.error('Failed')
 */

export const paddingAroundStatements = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: {
      description: 'Require blank lines around await expressions and toast.* calls',
    },
    messages: {
      missingBlankLineBefore: 'Expected a blank line before this {{kind}} statement.',
      missingBlankLineAfter: 'Expected a blank line after this {{kind}} statement.',
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()

    function getStatementKind(node) {
      if (node.type !== 'ExpressionStatement') return null
      const expr = node.expression

      if (expr.type === 'AwaitExpression') return 'await'

      if (
        expr.type === 'CallExpression' &&
        expr.callee.type === 'MemberExpression' &&
        expr.callee.object.type === 'Identifier' &&
        expr.callee.object.name === 'toast'
      ) return 'toast'

      return null
    }

    function getSiblings(node) {
      const body = node.parent?.body
      return Array.isArray(body) ? body : null
    }

    function hasBlankLineBetween(nodeA, nodeB) {
      return nodeB.loc.start.line - nodeA.loc.end.line >= 2
    }

    return {
      ExpressionStatement(node) {
        const kind = getStatementKind(node)
        if (!kind) return

        const siblings = getSiblings(node)
        if (!siblings) return

        const index = siblings.indexOf(node)
        const prev = siblings[index - 1]
        const next = siblings[index + 1]

        if (prev && !hasBlankLineBetween(prev, node)) {
          context.report({
            node,
            messageId: 'missingBlankLineBefore',
            data: { kind },
            fix(fixer) {
              return fixer.insertTextAfter(sourceCode.getLastToken(prev), '\n')
            },
          })
        }

        if (next && !hasBlankLineBetween(node, next)) {
          context.report({
            node,
            messageId: 'missingBlankLineAfter',
            data: { kind },
            fix(fixer) {
              return fixer.insertTextAfter(sourceCode.getLastToken(node), '\n')
            },
          })
        }
      },
    }
  },
}

export default {
  rules: {
    'padding-around-statements': paddingAroundStatements,
  },
}
