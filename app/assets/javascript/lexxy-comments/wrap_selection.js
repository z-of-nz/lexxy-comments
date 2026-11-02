import { Lexical } from "lexxy"
import { $isCommentMarkNode } from "lexxy-comments/comment_mark_node"

const { $isDecoratorNode, $isElementNode, $isTextNode } = Lexical

// Adapted from @lexical/mark's $wrapSelectionInMarkNode, which can't be imported here:
// under importmap it would load its own copy of Lexical instead of the one Lexxy bundles.
//
// Runs of adjacent inline nodes that share a parent are wrapped in one mark; blocks and
// existing comment marks split the run, so a selection across paragraphs yields one mark
// per paragraph.
export function $wrapSelectionInCommentMark(selection, $createMark) {
  let currentParent = null
  let currentMark = null

  for (const node of selection.extract()) {
    if (currentMark?.isParentOf(node) || $isCommentMarkNode(node) || node.is(currentParent)) continue

    if ($isWrappable(node)) {
      const parent = node.getParent()
      if (!parent.is(currentParent)) {
        currentParent = parent
        currentMark = null
      }

      if (currentMark === null) {
        currentMark = $createMark()
        node.insertBefore(currentMark)
      }
      currentMark.append(node)
    } else {
      currentParent = null
      currentMark = null
    }
  }

  if (currentMark !== null) {
    currentMark.selectEnd()
  }
}

function $isWrappable(node) {
  return $isTextNode(node) || (($isElementNode(node) || $isDecoratorNode(node)) && node.isInline())
}
