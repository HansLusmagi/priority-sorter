# Priority Sorter

Vite + React + TypeScript app for workshop facilitation. Two board types: Priority Sorter (drag & drop card sorting) and Timeline (Gantt chart + task tree with inline editing).

## Setup

- `npm run dev` — dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build

## Files

| Path | Purpose |
|---|---|
| `src/types.ts` | Shared types: Board, SorterCard, TimelineTask, column config |
| `src/utils/storage.ts` | localStorage load/save/migrate |
| `src/utils/share.ts` | URL hash encode/decode for sharing |
| `src/utils/dates.ts` | date-fns wrappers for date math |
| `src/utils/id.ts` | ID generation |
| `src/hooks/useTheme.ts` | Dark/light mode toggle |
| `src/hooks/useBoardStore.ts` | React Context + useReducer for board state |
| `src/AppShell.tsx` | Main layout: sidebar, topbar, board routing, all dialogs |
| `src/components/SorterBoard/SorterBoard.tsx` | Card sorting board with drag-drop, notes, column config |
| `src/components/TimelineBoard/TimelineBoard.tsx` | Timeline board orchestrator |
| `src/components/TimelineBoard/TaskTreePanel.tsx` | Inline-editable task tree |
| `src/components/TimelineBoard/GanttChart.tsx` | Gantt chart with draggable bar edges |

## Key conventions

- Board type stored in `board.type` (`"sorter"` or `"timeline"`)
- localStorage key: `ps-boards`, `ps-current-board`, `ps-theme`, `ps-sidebar-collapsed`
- Migration: boards without `type` get `type: "sorter"` on load
- `lucide-react` for all icons (no manual `data-lucide` + `createIcons()`)
- `date-fns` for all date arithmetic
- Tailwind CSS v4 for utility classes; component styles use CSS variables
- Overlays use `<Overlay>` component with escape/backdrop close

## Sorter Board

- 6 columns via `COLUMN_KEYS` array
- Cards store text, column, notes array, `_expanded`/`_addingNote` state
- Column config (label, icon, color) editable via right-click context menu
- Drag uses HTML5 native drag API with `setDragImage`

## Timeline Board

- Tasks form a recursive tree (parent → subtasks → sub-subtasks)
- Each task: id, name, start/end dates, progress (0-100), color, subtasks
- **Date cascade**: parent start = min(child starts), parent end = max(child ends)
- **Progress**: auto-calculated (duration-weighted) for parents; manual override with lock
- Gantt chart: day/week/month zoom, draggable bar edges (start/end)
- Colors: auto-assigned from `ROOT_TASK_PALETTE`, opacity per nesting level

## Share

- `buildShareUrl(data)` → `#board=<base64-encoded JSON>` URL hash
- On load, `readShareHash()` checks for `#board=` and prompts import
- Import creates a new board (deduplicates name with `(2)`, `(3)`, etc.)

## Deploy

`npm run build` → deploy `dist/` to any static host (Cloudflare Pages, Netlify, etc.)
