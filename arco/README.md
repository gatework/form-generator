# Form Generator — Arco Design Vue

This is the Vue 3 / Arco Design Vue entry point of the `gatework/form-generator`
fork, on `feat/arco-design-vue`. The original Vue 2 / Element UI application stays
in the root `src/` directory for upstream comparisons. This entry point bundles
its own runtime, editor assets and styles.

## Run and verify

Node.js 24+ and pnpm 9+:

```sh
pnpm --dir arco install --frozen-lockfile
pnpm --dir arco dev
pnpm --dir arco test
pnpm --dir arco build
pnpm --dir arco exec playwright install chromium
pnpm --dir arco test:e2e
```

`test` checks schema validation, Arco rendering and data-source behavior, then
compiles an exported SFC containing all field types with `vue-tsc`. Browser tests
exercise the built designer and a separately built exported rich-text SFC,
including editing, validation, reset, disabled inheritance and offline assets.

## Designer capabilities

The palette contains 21 types: input, textarea, password, number, rich text,
select, cascader, radio group, checkbox group, switch, slider, time, time range,
date, date range, rating, color picker, upload, row container, button and table.

- Add by click or drag. Nest fields inside row containers, move them between
  rows, reorder with drag or move buttons, and duplicate or delete a field or
  subtree. The property panel edits field or form settings without leaving the
  canvas; its tabs and the palette adapt to narrow screens.
- Configure field names, labels, defaults, required/disabled state, 24-column
  widths, label alignment/width, form layout/size/gutter and form buttons.
  Per-control settings cover choices and cascader trees, numeric ranges,
  date/time formats, icons, upload limits, rich-text height/read-only mode,
  button actions and table columns/data.
- Preview runs the actual controls with required and custom regular-expression
  rules, submit/reset actions and inherited disabled state. Tables display
  configured rows and operation columns; buttons can submit, reset or emit an
  application action. Each table column may define `actions` with a `name`,
  `label` and optional Arco button `type`.
- Select/cascader/radio/checkbox options and table rows can use remote JSON.
  Configure GET or POST, a response path, option key mappings and a JSON POST
  body. Loading, errors and retry are visible; replaced or unmounted requests
  are cancelled. Requests omit credentials; authenticated APIs need an
  application-specific integration. Cross-origin endpoints must permit CORS.
- Inspect and edit JSON or generated Vue code in CodeMirror, with syntax
  highlighting, line numbers and editing shortcuts. Applying valid JSON
  replaces the design after confirmation. Editing generated Vue affects the
  code copied/downloaded from that dialog; it does not reverse-update the canvas.
- Export/import versioned JSON, copy/download Vue code, and retain valid drafts
  in browser storage. Invalid imports leave the current form intact. Storage or
  validation failures are shown instead of reporting that a draft was saved.
- Chinese/English, light/dark mode and primary colors synchronize with a
  same-origin host. Appearance changes preserve the design and rich-text HTML.

The designer needs no backend or CDN for its own UI. Remote data sources and
user-authored external media URLs still access the configured endpoints. Upload
selection in preview stays local and does not send files automatically.

## Rich text and exported Vue components

Rich text uses self-hosted `tinymce@6.8.6`, with local plugins, skins, Chinese
translations and emoji data. Its editor includes formatting, lists, links,
images, tables, source code, preview, fullscreen and undo/redo. Local images are
embedded as data URLs; no image-upload service or Tiny Cloud API key is required.
The Vue 3 component binds HTML through `modelValue`/`update:modelValue`, integrates
Arco validation, and cleans up its editor when closed or removed.

The pinned TinyMCE package is MIT licensed. It is an older, unsupported major
version: Tiny's [support policy](https://www.tiny.cloud/docs/tinymce/latest/support/)
states that even commercial security support for TinyMCE 6 ended on June 6,
2025. This integration does not supply ongoing TinyMCE security fixes. Moving to
a newer major requires reviewing its license and integration changes.

Vue export produces a standalone `<script setup lang="ts">` SFC; it does not
require this designer at runtime. Install Vue 3 and `@arco-design/web-vue` in the
consumer project. Rich-text exports additionally require exactly
`tinymce@6.8.6` and Vite-compatible `?raw` CSS imports; the complete rich-text
component is embedded in the SFC. Remote data-source loading is embedded when
used. CodeMirror is only a designer dependency and is not required by exports.

Exports preserve nested rows, defaults, field properties, validation and
inherited disabled state. They emit `submit` after validation, `action` for
custom buttons, `table-action` with `{ field, action, record }` for table operation
buttons, and `upload-error` for configured size limits. The table event includes
the field name, configured action name and the clicked row object; handle it with
`@table-action` in the consuming application. Operation buttons inherit field,
row-container and form disabled state. Connect these
events to the application's persistence/actions, and configure upload endpoints
and handling before enabling uploads in the exported form. Exported language
and dark-mode values are captured at generation time; connect them to the host's
reactive settings if the consuming application needs live appearance changes.

## Compatibility boundary

This is a separate Arco schema. Old Element JSON, localStorage keys and Vue 2
exports are not modified or automatically converted. Unsupported/legacy JSON is
rejected explicitly. Back up old forms in the original designer before switching
workflows. Restored designer capabilities do not imply compatibility with every
Element component property or upstream third-party plugin.

## Embed in go-admin-ui

After building, run in the frontend repository:

```sh
node scripts/sync-form-generator.mjs ../form-generator/arco/dist
pnpm build:prod
```

The frontend ships `public/form-generator/` and loads
`/form-generator/index.html`. The old backend `/form-generator` endpoint is no
longer used by that page. When adding the public directory to an already running
Vite server for the first time, restart the server so it indexes the new files.

`dist/SOURCE.json` records the fork, branch, base commit, dirty-worktree flag,
source hash and artifact checksums. A dirty build identifies a local snapshot,
not a published release. The sync command verifies hashes before copying.
The original `LICENSE`, `THIRD_PARTY_NOTICES.md` and `third-party/` license files
ship with the bundle and are included in the checksums. The editor notices are
copied from the installed TinyMCE/CodeMirror packages and their runtime dependencies.

The host sends `form-generator:appearance` with `locale`, `dark`, and optional
`primary` RGB triplets keyed `1` through `10`. Only messages from `parent` at the
same origin are accepted. The designer sends `form-generator:ready` to that origin
once mounted. Standalone initial settings also accept `locale` and `theme` query
parameters.
