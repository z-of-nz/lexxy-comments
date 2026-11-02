# lexxy-comments

Inline comments for the [Lexxy](https://lexxy.dev) rich text editor, built on its [extensions API](https://lexxy.dev/docs/extensions.html). The editor marks the commented text; your Rails app stores the comments.

The gem also ships two smaller extensions: a read-only comment mode, and superscript/subscript toolbar buttons.

## How it works

Selecting text and submitting the comment dropdown wraps the selection in `<mark>` elements:

```html
<!-- a new comment, not saved yet -->
<mark data-comment-group="a1b2c3d4" data-comment-create="Comment text">commented text</mark>

<!-- a saved comment -->
<mark data-comment-sgid="…">commented text</mark>

<!-- a saved comment the user deleted -->
<mark data-comment-sgid="…" data-comment-delete="true">commented text</mark>
```

Your app does the rest when the form is saved: it creates a record for each `data-comment-group`, replaces the group and body with the record's `data-comment-sgid`, and destroys the records whose marks carry `data-comment-delete`. A selection across paragraphs produces several marks with the same group; every one of them carries the body.

Other `<mark>` elements, such as Lexxy's color highlights, are left alone.

## Requirements

- Lexxy 1.0.3 or newer, loaded through importmap-rails and pinned as `lexxy`
- Propshaft or Sprockets, to serve the gem's JavaScript and CSS

The extensions use Lexical only through `Lexxy.Lexical`, so they always run against the copy Lexxy bundles.

## Installation

The gem isn't on RubyGems; install it from GitHub:

```ruby
# Gemfile
gem "lexxy-comments", git: "https://github.com/z-of-nz/lexxy-comments.git", branch: "main"
```

The gem adds its modules to your importmap. Pin Lexxy as `lexxy` if you haven't already:

```ruby
# config/importmap.rb
pin "lexxy", to: "lexxy.js"
```

Register the extensions:

```js
import * as Lexxy from "lexxy"
import { CommentModeExtension, CommentsExtension, ScriptFormatExtension } from "lexxy-comments"

Lexxy.configure({
  global: {
    extensions: [ CommentsExtension, CommentModeExtension, ScriptFormatExtension ]
  }
})
```

Include the stylesheet:

```erb
<%= stylesheet_link_tag "lexxy-comments" %>
```

## Configuration

`CommentsExtension` reads the `comments` key of an editor's configuration:

| Option        | Default            | Purpose                                    |
|---------------|--------------------|--------------------------------------------|
| `toolbar`     | `true`             | Add the comment button to the toolbar      |
| `title`       | `"Comment"`        | Button title and dialog label              |
| `placeholder` | `"Add a comment…"` | Textarea placeholder                       |
| `submitLabel` | `"Comment"`        | Submit button label                        |
| `hotkey`      | `"cmd+q ctrl+q"`   | Shortcut that opens the dropdown           |

To show the comment button in only some editors, turn it off by default and on in a preset:

```js
Lexxy.configure({
  global: { extensions: [ CommentsExtension ] },
  default: { comments: { toolbar: false } },
  commenting: { comments: { toolbar: true } }
})
```

```erb
<%= form.rich_text_area :body, preset: "commenting" %>
```

### Comment mode

`CommentModeExtension` is enabled on editors with `data-comment-mode="true"`. Their text stays selectable, so it can be commented on, but typing, deleting, pasting, dropping and formatting are blocked. Comments can still be added and deleted.

```erb
<%= form.rich_text_area :body, preset: "commenting", data: { comment_mode: "true" } %>
```

### Superscript and subscript

`ScriptFormatExtension` adds superscript and subscript buttons after the bold button, in every rich text editor.

## Events

Both are dispatched on, and listened for on, the `<lexxy-editor>` element.

| Event                   | Detail      | Direction        | Meaning                                              |
|-------------------------|-------------|------------------|------------------------------------------------------|
| `lexxy-comments:added`  | `{ group }` | from the editor  | Marks for a new, unsaved comment were inserted       |
| `lexxy-comments:delete` | `{ sgid }`  | to the editor    | Flag that comment's marks with `data-comment-delete` |

```js
editorElement.addEventListener("lexxy-comments:added", ({ detail }) => {
  const marks = editorElement.querySelectorAll(`mark[data-comment-group="${detail.group}"]`)
  // show marks[0].dataset.commentCreate as an unsaved comment
})

editorElement.dispatchEvent(new CustomEvent("lexxy-comments:delete", { detail: { sgid } }))
```

The `INSERT_COMMENT_COMMAND` Lexical command, with the comment body as payload, inserts a comment for the current selection without the toolbar.

## Server side

### Processing marks on save

A minimal version, given the submitted HTML and a `Comment` model that includes `ActionText::Attachable`:

```ruby
fragment = Nokogiri::HTML5.fragment(html)

fragment.css("mark[data-comment-group]").group_by { |mark| mark["data-comment-group"] }.each do |_group, marks|
  comment = Comment.create!(content: marks.first["data-comment-create"], user: Current.user)

  marks.each do |mark|
    mark["data-comment-sgid"] = comment.attachable_sgid.to_s
    mark.remove_attribute("data-comment-group")
    mark.remove_attribute("data-comment-create")
  end
end

fragment.css("mark[data-comment-delete]").each do |mark|
  ActionText::Attachable.from_attachable_sgid(mark["data-comment-sgid"])&.destroy
  mark.replace(mark.children)
end

fragment.to_html
```

### Allowing the attributes

Action Text sanitizes rich text again when rendering it, with your app's allowlist. `mark` is allowed by default, but the `data-comment-*` attributes may not be:

```ruby
# config/initializers/action_text.rb
ActiveSupport.on_load(:action_text_content) do
  allowed_attributes = Class.new.include(ActionText::ContentHelper).new.sanitizer_allowed_attributes
  ActionText::ContentHelper.allowed_attributes = allowed_attributes +
    %w[ data-comment-sgid data-comment-group data-comment-create data-comment-delete ]
end
```

## Migrating from `<action-text-attachment-mark-node>`

Content written by the earlier Lexxy fork wraps comments in `<action-text-attachment-mark-node sgid="…">`. The editor still reads that tag and saves it back as `<mark>`, but stored content should be migrated so rendered pages and server code only see one format:

| Old attribute              | New attribute         |
|----------------------------|-----------------------|
| `sgid`                     | `data-comment-sgid`   |
| `data-selection-group`     | `data-comment-group`  |
| `data-create-meta-content` | `data-comment-create` |
| `data-delete-meta-content` | `data-comment-delete` |
| `content-type`             | (dropped)             |
