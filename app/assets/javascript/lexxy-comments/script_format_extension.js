import * as Lexxy from "lexxy"

const { COMMAND_PRIORITY_NORMAL, FORMAT_TEXT_COMMAND, mergeRegister } = Lexxy.Lexical

const FORMATS = [
  { format: "superscript", label: "▲", title: "Superscript" },
  { format: "subscript", label: "▼", title: "Subscript" }
]

// Superscript and subscript toolbar buttons. Lexxy's toolbar dispatches a button's
// data-command by name, so each format is registered as a named command.
export class ScriptFormatExtension extends Lexxy.Extension {
  get enabled() {
    return this.editorElement.supportsRichText
  }

  get lexicalExtension() {
    return this.defineExtension({
      name: "lexxy-comments/script-format",
      register: (editor) => mergeRegister(
        ...FORMATS.map(({ format }) => editor.registerCommand(format, () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format), COMMAND_PRIORITY_NORMAL))
      )
    })
  }

  initializeToolbar(toolbar) {
    toolbar.querySelector("button[name=bold]").after(...FORMATS.map(createButton))
  }
}

function createButton({ format, label, title }) {
  const button = document.createElement("button")
  button.className = "lexxy-editor__toolbar-button"
  button.type = "button"
  button.name = format
  button.title = title
  button.dataset.command = format
  button.textContent = label
  return button
}
