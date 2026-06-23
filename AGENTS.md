# Priority Sorter

A single-file HTML card sorting tool for workshop facilitators. Users drag cards into priority columns; results export as JSON with impact scores for ICE analysis.

## Files

- `index.html` — the whole app (CSS + HTML + JS inline)
- `lucide.min.js` — SVG icon library (Lucide v0.468.0, loaded before the inline script)

## How it works

- 6 columns: **Cards to sort**, **Must have**, **Big win**, **Solid**, **Minor improvement**, **Barely matters**
- New cards land in "Cards to sort"
- Drag & drop between columns (HTML5 native drag API)
- Impact scoring is column-based (hidden from sorters, visible in export):
  - Must have (critical) → 5 (1-5) / 10 (1-10)
  - Big win (important) → 4 / 8
  - Minor improvement (sorting) → 3 / 6
  - Solid (nice) → 2 / 4
  - Barely matters (later) → 1 / 2
  - Unsorted → 0 / 0

## Adding cards

- **Single**: Click the `+` button in a column header (always visible) or "+ Add card" button at the bottom of a column body on hover → dialog with text input; cards land in that column
- **Bulk**: "↓ Bulk import" header button → dialog with two tabs:
  - "One per line" tab — paste cards line by line
  - "JSON array" tab — paste `["card1", "card2"]` format (pre-filled with example)
  - "Download template" link downloads `cards-template.json`

## Card notes

- Each card has a toggle button in its own row below the card text — always visible
- No notes → shows `+ Add note`
- Has notes → shows `▸ Notes (n)` / `▾ Notes (n)`
- Clicking toggles an expandable note section:
  - **No notes** → shows inline textarea (Enter to save)
  - **Has notes** → shows all notes as a list with `⋮` per-note menu button
- "⋮" menu per note reveals inline "Edit" and "Remove" actions
- "+ Add note" button at bottom of expanded area (when notes exist) opens an inline textarea
- "Edit" opens a dialog for that note; "Remove" deletes the note
- Notes included in export as `"notes": [...]` array

## Export

Exports as JSON with shape:
```json
{
  "exportedAt": "2026-06-23T...",
  "impactMapping": { ... },
  "cards": [
    { "id": "c123-0", "text": "Build login", "column": "critical",
      "notes": ["some context"], "impact_5": 5, "impact_10": 10 }
  ]
}
```
Labels in `impactMapping` use the current `columnConfig` labels (reflects any column renames).

## Boards

Multiple boards are supported. Each board has its own cards and column config, stored in `localStorage('ps-boards')` as a keyed object. The active board ID is stored in `localStorage('ps-current-board')`.

- **Sidebar** (left, 240px, `#060708` bg) lists all boards
- **Click** a board to switch to it (auto-saves current board first)
- **Double-click** a board name to rename via dialog
- **⋮** on hover opens a dropdown with Rename, Delete, and Icon color picker
- **+ New Board** at the top (below logo) opens a dialog to name and create a new board
- On first load, any existing `ps-columns` data is migrated to a "Board 1"

## Design

- **Dark mode default** with Linear-inspired palette (`#121416` page, `#1A1C1E` cards, `#0A0B0C` columns, `#060708` sidebar)
- **Light mode toggle** (🌙/☀️ in sidebar footer) — preference saved to localStorage
- **Column headers** use Lucide icons colored per column — right-click a header to rename, change icon, or set color
- **Cards** also show matching Lucide icons in their column color
- **Columns** have 6px radius with subtle drag-over outline, stretch to fill viewport
- **Cards** have a slightly lighter background than columns + subtle drop shadow
- **Right-click a column header** to rename it, change its icon (with live search), or pick a new color from swatches or a color picker
- **Sidebar** at left with dark bg, logo, new board button, board list (with colored icons), theme toggle with divider
- **Topbar** at top of main area with page bg color and border-bottom divider (bulk import + export buttons)
- **Board items** have a `layout-dashboard` icon; active board icon uses custom color (default accent), inactive uses text-secondary
- **Full-width layout** — no max-width constraint, columns span edge-to-edge
- **"ICE" never mentioned** — columns are framed as priority levels, numbers only appear in export
- **Drag ghost** is a full card clone captured via `setDragImage` — original card stays in place during drag, moved on drop via `render()`

## Code conventions

- All IDs use hyphens: `col-critical`, `count-uncategorized`, `addOverlay`
- Column keys in JS: `uncategorized`, `critical`, `important`, `nice`, `sorting`, `later`
- Board IDs: `b_<timestamp>_<random>` via `genBoardId()`
- Event delegation on `.columns` container for card drag/click/note-toggle
- Event delegation on `.sidebar` for board click/rename/delete
- Drop-zone listeners attached once at load (not rebound on render)
- Card note state tracked via `_expanded`, `_addingNote`, and `notes` fields on card objects
- `draggable="true"` on `.card` (the outer wrapper, not `.card-main`) for full-card drag initiation
- `.note-toggle` is a `<span role="button" tabindex="0">` (not a `<button>`) to avoid event capture preventing parent drag
- Drag starts via `setDragImage` with a cloned card positioned off-screen and removed via `setTimeout(..., 0)`
- Icons use Lucide SVG library via `data-lucide` attributes; `lucide.createIcons()` called after every `render()`
- Column config (label, icon, color) stored per-board in `columnConfig`, persisted via `saveCurrentBoard()`
- Card column icons mapped via `columnConfig[key].icon` instead of a static object
- Lucide v0.468.0 stores icons as arrays on the `lucide` object in PascalCase (`ArrowUpDown`); `data-lucide` expects kebab-case (`arrow-up-down`); `renderGrid` converts via `replace(/([a-z0-9])([A-Z])/g, '$1-$2')...toLowerCase()`
- Use `var` (no transpilation needed — works in any browser)
- CSS uses class-based column wrapping (`.col-{key}`) with inline colors from config
- Light mode CSS vars injected via JS `<style>` element
- Board auto-save happens at the end of every `render()` call via `saveCurrentBoard()`

## Design decisions

- **No inline add form** — keeping columns clean, add/sort dialogs are dialog-based
- **Expandable notes** — notes shown inline on card expand, added inline, edited via dialog
- **Single HTML file** — easy to email/share, works offline
- **Linear-style palette** — dark mode uses exact Linear bg tokens (`#121416`, `#060708`, `#23252A`)
- **Configurable columns** — names, icons, and colors editable via right-click context menu on column headers; column keys (`uncategorized`, `critical`, etc.) are stable internal IDs
- **Per-board storage** — each board stores its own `cards` array and `columnConfig`, giving full isolation between boards
- **Sidebar layout** — sidebar is `240px` fixed width with `#060708` background; topbar uses page background to visually separate controls from columns
- **Board actions via ⋮ dropdown** — avoids clutter of always-visible × buttons, keeps the UI clean
- **All dialogs use overlay + dialog-box** — no native `prompt()` or `confirm()` for board operations, consistent UX with the rest of the app
