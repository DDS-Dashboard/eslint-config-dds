/**
 * ESLint rule: no-repeated-inline-types
 *
 * Flags inline union type literals (e.g., 'foo' | 'bar' | 'baz') that appear
 * in multiple locations. These should be extracted to a named type alias.
 *
 * Only flags unions with 3+ members to avoid noise from trivial unions like
 * string | undefined.
 */

const unionRegistry = new Map()

export const noRepeatedInlineTypes = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow repeated inline union types — extract to a named type alias',
    },
    messages: {
      duplicateUnion:
        'Inline union type "{{ union }}" is repeated across files. Extract to a named type alias.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minMembers: { type: 'integer', minimum: 2, default: 3 },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const minMembers = context.options[0]?.minMembers ?? 3

    function normalizeUnion(node) {
      if (node.type !== 'TSUnionType') return null

      const members = node.types
        .filter((t) => t.type === 'TSLiteralType' && t.literal?.type === 'Literal' && typeof t.literal.value === 'string')
        .map((t) => t.literal.value)

      if (members.length < minMembers) return null

      return [...members].sort().join(' | ')
    }

    return {
      TSUnionType(node) {
        // Skip if inside a type alias declaration (that IS a named type)
        let parent = node.parent
        while (parent) {
          if (parent.type === 'TSTypeAliasDeclaration') return
          parent = parent.parent
        }

        const key = normalizeUnion(node)
        if (!key) return

        const filename = context.filename

        if (!unionRegistry.has(key)) {
          unionRegistry.set(key, new Set())
        }

        const locations = unionRegistry.get(key)
        locations.add(filename)

        if (locations.size > 1) {
          context.report({
            node,
            messageId: 'duplicateUnion',
            data: { union: key },
          })
        }
      },
    }
  },
}

export default {
  rules: {
    'no-repeated-inline-types': noRepeatedInlineTypes,
  },
}
