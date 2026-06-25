export type BoardType = "sorter" | "timeline"

export interface ColumnConfigEntry {
  label: string
  icon: string
  color: string
}

export interface SorterCard {
  id: string
  text: string
  column: string
  notes: string[]
  _expanded?: boolean
  _addingNote?: boolean
}

export interface TimelineTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  color: string
  milestone: boolean
  expanded: boolean
  subtasks: TimelineTask[]
  progressLocked?: boolean
}

export interface BaseBoard {
  id: string
  name: string
  type: BoardType
  iconColor: string
  createdAt: string
}

export interface SorterBoard extends BaseBoard {
  type: "sorter"
  cards: SorterCard[]
  columnConfig: Record<string, ColumnConfigEntry>
}

export interface TimelineBoard extends BaseBoard {
  type: "timeline"
  tasks: TimelineTask[]
}

export type Board = SorterBoard | TimelineBoard

export interface ShareData {
  name: string
  type: BoardType
  cards?: SorterCard[]
  columnConfig?: Record<string, ColumnConfigEntry>
  tasks?: TimelineTask[]
}

export const COLUMN_KEYS = ["uncategorized", "critical", "important", "nice", "sorting", "later"]

export const DEFAULT_CONFIG: Record<string, ColumnConfigEntry> = {
  uncategorized: { label: "Cards to sort", icon: "inbox", color: "#6B7280" },
  critical: { label: "Must have", icon: "alert-circle", color: "#f87171" },
  important: { label: "Big win", icon: "flag", color: "#fb923c" },
  nice: { label: "Solid", icon: "thumbs-up", color: "#34d399" },
  sorting: { label: "Minor improvement", icon: "arrow-up-down", color: "#22d3ee" },
  later: { label: "Barely matters", icon: "chevron-last", color: "#8A8F98" },
}

export const IMPACT: Record<string, { score5: number; score10: number }> = {
  uncategorized: { score5: 0, score10: 0 },
  critical: { score5: 5, score10: 10 },
  important: { score5: 4, score10: 8 },
  nice: { score5: 3, score10: 6 },
  sorting: { score5: 2, score10: 4 },
  later: { score5: 1, score10: 2 },
}

export const COLOR_SWATCHES = [
  "#f87171", "#fb923c", "#fbbf24", "#4ade80", "#34d399",
  "#2dd4bf", "#22d3ee", "#60a5fa", "#818cf8", "#a78bfa",
  "#e879f9", "#f472b6", "#6B7280", "#8A8F98", "#9CA3AF",
]

export const ROOT_TASK_PALETTE = [
  "#5E6AD2", "#f87171", "#34d399", "#fb923c",
  "#a78bfa", "#22d3ee", "#f472b6", "#fbbf24",
]
