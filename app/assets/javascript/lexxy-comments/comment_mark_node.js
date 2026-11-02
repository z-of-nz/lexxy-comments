import { Lexical } from "lexxy"

const { $applyNodeReplacement, ElementNode } = Lexical

const ATTRIBUTES = {
  sgid: "data-comment-sgid",
  group: "data-comment-group",
  create: "data-comment-create",
  delete: "data-comment-delete"
}

// Marks stored before the move to <mark>; still read so un-migrated content keeps its comments.
const LEGACY_TAG = "action-text-attachment-mark-node"
const LEGACY_ATTRIBUTES = {
  sgid: "sgid",
  group: "data-selection-group",
  create: "data-create-meta-content",
  delete: "data-delete-meta-content"
}

export const COMMENT_MARK_ATTRIBUTES = Object.values(ATTRIBUTES)
export const LEGACY_COMMENT_MARK = { tag: LEGACY_TAG, attributes: Object.values(LEGACY_ATTRIBUTES) }

// Wraps the text a comment refers to. The comment itself lives in the host app: the
// attributes tell the server to create it (group + create), which record it is (sgid),
// or that it should be destroyed (delete).
export class CommentMarkNode extends ElementNode {
  __comment

  static getType() {
    return "comment_mark"
  }

  static clone(node) {
    return new CommentMarkNode(node.__comment, node.__key)
  }

  static importJSON(serializedNode) {
    return $createCommentMarkNode(serializedNode.comment).updateFromJSON(serializedNode)
  }

  static importDOM() {
    return {
      mark: (element) => {
        if (isCommentMarkElement(element)) {
          return { conversion: element => $convertCommentMark(element, ATTRIBUTES), priority: 2 }
        } else {
          return null
        }
      },
      [LEGACY_TAG]: () => ({ conversion: element => $convertCommentMark(element, LEGACY_ATTRIBUTES), priority: 2 })
    }
  }

  constructor(comment = {}, key) {
    super(key)
    this.__comment = Object.freeze({ ...comment })
  }

  get sgid() {
    return this.getLatest().__comment.sgid
  }

  markForDeletion() {
    const writable = this.getWritable()
    writable.__comment = Object.freeze({ ...writable.__comment, delete: "true" })
  }

  createDOM() {
    const element = document.createElement("mark")
    writeAttributes(element, this.__comment)
    return element
  }

  updateDOM(prevNode, element) {
    if (prevNode.__comment !== this.__comment) {
      writeAttributes(element, this.__comment)
    }
    return false
  }

  exportDOM() {
    const element = document.createElement("mark")
    writeAttributes(element, this.__comment)
    return { element }
  }

  exportJSON() {
    return { ...super.exportJSON(), comment: this.__comment }
  }

  isInline() {
    return true
  }

  canBeEmpty() {
    return false
  }

  canInsertTextBefore() {
    return false
  }

  canInsertTextAfter() {
    return false
  }
}

export function $createCommentMarkNode(comment = {}) {
  return $applyNodeReplacement(new CommentMarkNode(comment))
}

export function $isCommentMarkNode(node) {
  return node instanceof CommentMarkNode
}

function isCommentMarkElement(element) {
  return element.hasAttribute(ATTRIBUTES.sgid) || element.hasAttribute(ATTRIBUTES.group)
}

function $convertCommentMark(element, attributes) {
  return { node: $createCommentMarkNode(readAttributes(element, attributes)) }
}

function readAttributes(element, attributes) {
  const comment = {}
  for (const [ key, name ] of Object.entries(attributes)) {
    if (element.hasAttribute(name)) {
      comment[key] = element.getAttribute(name)
    }
  }
  return comment
}

function writeAttributes(element, comment) {
  for (const [ key, name ] of Object.entries(ATTRIBUTES)) {
    if (comment[key]) {
      element.setAttribute(name, comment[key])
    } else {
      element.removeAttribute(name)
    }
  }
}
