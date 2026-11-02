import * as Lexxy from "lexxy"
import { registerEventListener } from "lexxy-comments/listener_helper"

const {
  COMMAND_PRIORITY_CRITICAL,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  DROP_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  INSERT_TAB_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  REMOVE_TEXT_COMMAND,
  mergeRegister
} = Lexxy.Lexical

const EDITING_COMMANDS = [
  CONTROLLED_TEXT_INSERTION_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  DROP_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  INSERT_TAB_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  REMOVE_TEXT_COMMAND
]

// Lexical lets the browser apply plain typing to the DOM and reconciles afterwards, so
// blocking the commands alone would leave the DOM and the editor state out of sync.
const EDITING_EVENTS = [ "beforeinput", "paste", "cut", "drop" ]

// Opt in with data-comment-mode="true" on the editor. The text stays selectable so it
// can be commented on, but the user can't change it. Comment marks are still added and
// removed, since those go through editor updates rather than user input.
export class CommentModeExtension extends Lexxy.Extension {
  get enabled() {
    return this.editorElement.dataset.commentMode === "true"
  }

  get lexicalExtension() {
    return this.defineExtension({
      name: "lexxy-comments/comment-mode",
      register: (editor) => {
        const preventEditing = (event) => {
          if (editor.getRootElement()?.contains(event.target)) {
            event.preventDefault()
            event.stopPropagation()
          }
        }

        return mergeRegister(
          ...EDITING_COMMANDS.map(command => editor.registerCommand(command, $swallowCommand, COMMAND_PRIORITY_CRITICAL)),
          ...EDITING_EVENTS.map(type => registerEventListener(this.editorElement, type, preventEditing, { capture: true }))
        )
      }
    })
  }
}

function $swallowCommand(payload) {
  if (payload instanceof Event) {
    payload.preventDefault()
  }
  return true
}
