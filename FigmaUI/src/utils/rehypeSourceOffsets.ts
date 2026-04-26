import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * Annotates hast elements with `dataMdStart` / `dataMdEnd` from unist positions
 * so the rendered DOM can be mapped back to markdown source byte offsets.
 */
export function rehypeSourceOffsets() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const pos = node.position;
      if (pos?.start?.offset === undefined) {
        return;
      }
      node.properties = { ...node.properties, dataMdStart: pos.start.offset };
      if (pos.end?.offset !== undefined) {
        node.properties = { ...node.properties, dataMdEnd: pos.end.offset };
      }
    });
  };
}
