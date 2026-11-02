import * as Lexxy from "lexxy"
import { $createCommentMarkNode, COMMENT_MARK_ATTRIBUTES, CommentMarkNode, LEGACY_COMMENT_MARK } from "lexxy-comments/comment_mark_node"
import { $wrapSelectionInCommentMark } from "lexxy-comments/wrap_selection"
import { INSERT_COMMENT_COMMAND } from "lexxy-comments/commands"
import { dispatch, registerEventListener } from "lexxy-comments/listener_helper"

const { $getSelection, $isRangeSelection, $nodesOfType, COMMAND_PRIORITY_NORMAL, mergeRegister } = Lexxy.Lexical

const DEFAULTS = {
  toolbar: true,
  title: "Comment",
  placeholder: "Add a comment…",
  submitLabel: "Comment",
  hotkey: "cmd+q ctrl+q"
}

const COMMENT_ICON = `
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M24,6.014c0,-1.966 -1.391,-3.563 -3.104,-3.563l-17.792,0c-1.713,0 -3.104,1.597 -3.104,3.563l0,7.125c0,1.966 1.391,3.562 3.104,3.562l4.696,0l-3,6.107l10.306,-6.107l5.79,0c1.713,0 3.104,-1.596 3.104,-3.562l0,-7.125Z"/>
  </svg>
`

// Inline comments whose content is stored by the host app. Selecting text and submitting
// the comment dropdown wraps the selection in comment marks carrying the comment body;
// the server creates the record on save and swaps the body for the record's sgid.
//
// Events, dispatched on and listened for on the <lexxy-editor>:
//   lexxy-comments:added  { group } — marks for a new, unsaved comment were inserted
//   lexxy-comments:delete { sgid }  — flag that comment's marks for deletion on save
export class CommentsExtension extends Lexxy.Extension {
  #toolbarListeners = []

  get enabled() {
    return this.editorElement.supportsRichText
  }

  get allowedElements() {
    return [ { tag: "mark", attributes: COMMENT_MARK_ATTRIBUTES }, LEGACY_COMMENT_MARK ]
  }

  get lexicalExtension() {
    return this.defineExtension({
      name: "lexxy-comments/comments",
      nodes: [ CommentMarkNode ],
      register: (editor) => mergeRegister(
        editor.registerCommand(INSERT_COMMENT_COMMAND, body => this.#insertComment(body), COMMAND_PRIORITY_NORMAL),
        registerEventListener(this.editorElement, "lexxy-comments:delete", event => this.#deleteComment(editor, event.detail.sgid))
      )
    })
  }

  // Lexxy's own <lexxy-toolbar-dropdown> is used rather than a subclass: the toolbar closes
  // every dropdown while the editor connects, before a subclass defined later would upgrade.
  initializeToolbar(toolbar) {
    if (this.#config.toolbar) {
      const dropdown = this.#createDropdown()
      toolbar.querySelector("button[name=divider]").after(dropdown)
      this.#listenToDropdown(dropdown)
    }
  }

  dispose() {
    while (this.#toolbarListeners.length) {
      this.#toolbarListeners.pop()()
    }
  }

  #insertComment(body) {
    const selection = $getSelection()
    if (!$isRangeSelection(selection) || selection.isCollapsed()) return false

    const group = Math.random().toString(16).slice(2, 10)
    $wrapSelectionInCommentMark(selection, () => $createCommentMarkNode({ group, create: body }))
    dispatch(this.editorElement, "lexxy-comments:added", { group })

    return true
  }

  #deleteComment(editor, sgid) {
    editor.update(() => {
      for (const mark of $nodesOfType(CommentMarkNode)) {
        if (mark.sgid === sgid) {
          mark.markForDeletion()
        }
      }
    })
  }

  #createDropdown() {
    const dropdown = document.createElement("lexxy-toolbar-dropdown")
    dropdown.className = "lexxy-editor__toolbar-dropdown lexxy-editor__toolbar-dropdown--comment"
    dropdown.innerHTML = `
      <button data-dropdown-trigger class="lexxy-editor__toolbar-button" type="button" name="comment" aria-haspopup="dialog" aria-expanded="false">
        ${COMMENT_ICON}
      </button>
      <div data-dropdown-panel role="dialog" hidden>
        <form method="dialog">
          <textarea rows="10" class="input" required></textarea>
          <div class="lexxy-editor__toolbar-dropdown-actions">
            <button type="submit" class="btn"></button>
          </div>
        </form>
      </div>
    `

    const trigger = dropdown.querySelector("[data-dropdown-trigger]")
    trigger.title = this.#config.title
    trigger.dataset.hotkey = this.#config.hotkey
    dropdown.querySelector("[data-dropdown-panel]").ariaLabel = this.#config.title
    dropdown.querySelector("textarea").placeholder = this.#config.placeholder
    dropdown.querySelector("[type=submit]").textContent = this.#config.submitLabel

    return dropdown
  }

  #listenToDropdown(dropdown) {
    const textarea = dropdown.querySelector("textarea")

    this.#toolbarListeners.push(
      registerEventListener(dropdown.querySelector("[data-dropdown-trigger]"), "click", () => {
        // The dropdown opens in its own click handler and then focuses the panel's first
        // button or input, which would skip the textarea.
        queueMicrotask(() => {
          if (dropdown.isOpen) {
            textarea.value = ""
            textarea.focus()
          }
        })
      }),
      registerEventListener(dropdown.querySelector("form"), "submit", (event) => {
        event.preventDefault()
        this.editorElement.editor.dispatchCommand(INSERT_COMMENT_COMMAND, textarea.value)
        dropdown.close()
      })
    )
  }

  get #config() {
    return { ...DEFAULTS, ...this.editorConfig.get("comments") }
  }
}
