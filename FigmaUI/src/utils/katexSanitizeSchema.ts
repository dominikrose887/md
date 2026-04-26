import type { Schema } from 'hast-util-sanitize';
import { defaultSchema } from 'rehype-sanitize';

/** Allow KaTeX HTML output (span + inline style + class tokens) through rehype-sanitize. */
export function createKatexSanitizeSchema(): Schema {
  return {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      span: [
        ...(defaultSchema.attributes?.span ?? []),
        'style',
        'ariaHidden',
        ['className', /^[\w\s-]+$/]
      ],
      '*': [...(defaultSchema.attributes?.['*'] ?? []), 'dataMdStart', 'dataMdEnd']
    }
  };
}
