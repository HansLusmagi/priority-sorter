import type { Board, ColumnConfigEntry, SorterBoard } from "../types"
import { COLUMN_KEYS, DEFAULT_CONFIG } from "../types"
import { genBoardId } from "./id"

let boardsCache: Record<string, Board> = {}
let currentId: string | null = null

export function loadBoards(): { boards: Record<string, Board>; currentId: string } {
  try {
    const saved = localStorage.getItem("ps-boards")
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed && typeof parsed === "object") boardsCache = parsed
    }
  } catch {}

  if (Object.keys(boardsCache).length === 0) {
    let oldConfig: Record<string, ColumnConfigEntry> | null = null
    try {
      const raw = localStorage.getItem("ps-columns")
      if (raw) oldConfig = JSON.parse(raw)
    } catch {}
    const id = genBoardId()
    const board: SorterBoard = {
      id,
      name: "Board 1",
      type: "sorter",
      cards: [],
      columnConfig: oldConfig || loadDefaultConfig(),
      iconColor: "#5E6AD2",
      createdAt: new Date().toISOString(),
    }
    boardsCache[id] = board
    localStorage.removeItem("ps-columns")
    saveBoards()
  }

  migrateBoards()

  try {
    currentId = localStorage.getItem("ps-current-board")
  } catch {}
  if (!currentId || !boardsCache[currentId]) {
    currentId = Object.keys(boardsCache)[0]
    localStorage.setItem("ps-current-board", currentId)
  }

  return { boards: boardsCache, currentId }
}

function migrateBoards() {
  let changed = false
  for (const id of Object.keys(boardsCache)) {
    const b = boardsCache[id] as any
    if (!b.type) {
      b.type = "sorter"
      changed = true
    }
    if (!b.iconColor) {
      b.iconColor = "#5E6AD2"
      changed = true
    }
    if (!b.createdAt) {
      b.createdAt = new Date().toISOString()
      changed = true
    }
    if (b.type === "sorter" && !b.columnConfig) {
      b.columnConfig = loadDefaultConfig()
      changed = true
    }
  }
  if (changed) saveBoards()
}

export function loadDefaultConfig(): Record<string, ColumnConfigEntry> {
  const cfg: Record<string, ColumnConfigEntry> = {}
  for (const k of COLUMN_KEYS) {
    cfg[k] = { ...DEFAULT_CONFIG[k] }
  }
  return cfg
}

export function saveBoards() {
  try {
    localStorage.setItem("ps-boards", JSON.stringify(boardsCache))
  } catch {}
}

export function saveCurrentBoard(board: Board) {
  if (currentId && boardsCache[currentId]) {
    boardsCache[currentId] = board
    saveBoards()
  }
}

export function setCurrentId(id: string) {
  currentId = id
  try {
    localStorage.setItem("ps-current-board", id)
  } catch {}
}

export function getBoards() {
  return boardsCache
}

export function getCurrentId() {
  return currentId
}
