import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react"
import type { Board, SorterBoard, TimelineBoard, BoardType, SorterCard, TimelineTask, ColumnConfigEntry } from "../types"
import { loadDefaultConfig } from "../utils/storage"
import { genBoardId } from "../utils/id"
import { loadBoards, saveBoards, saveCurrentBoard, setCurrentId } from "../utils/storage"

type Action =
  | { type: "LOAD"; boards: Record<string, Board>; currentId: string }
  | { type: "CREATE"; board: Board }
  | { type: "DELETE"; id: string }
  | { type: "RENAME"; id: string; name: string }
  | { type: "SET_ACTIVE"; id: string }
  | { type: "SET_ICON_COLOR"; id: string; color: string }
  | { type: "UPDATE_SORTER"; board: SorterBoard }
  | { type: "UPDATE_TIMELINE"; board: TimelineBoard }

interface BoardState {
  boards: Record<string, Board>
  currentId: string | null
}

function reducer(state: BoardState, action: Action): BoardState {
  switch (action.type) {
    case "LOAD":
      return { boards: action.boards, currentId: action.currentId }
    case "CREATE": {
      const boards = { ...state.boards, [action.board.id]: action.board }
      return { boards, currentId: action.board.id }
    }
    case "DELETE": {
      const boards = { ...state.boards }
      delete boards[action.id]
      if (state.currentId === action.id) {
        const keys = Object.keys(boards)
        const nextId = keys.length > 0 ? keys[0] : null
        return { boards, currentId: nextId }
      }
      return { ...state, boards }
    }
    case "RENAME": {
      const b = state.boards[action.id]
      if (!b) return state
      return { ...state, boards: { ...state.boards, [action.id]: { ...b, name: action.name } } }
    }
    case "SET_ACTIVE":
      return state.boards[action.id] ? { ...state, currentId: action.id } : state
    case "SET_ICON_COLOR": {
      const b = state.boards[action.id]
      if (!b) return state
      return { ...state, boards: { ...state.boards, [action.id]: { ...b, iconColor: action.color } } }
    }
    case "UPDATE_SORTER":
      return { ...state, boards: { ...state.boards, [action.board.id]: action.board } }
    case "UPDATE_TIMELINE":
      return { ...state, boards: { ...state.boards, [action.board.id]: action.board } }
    default:
      return state
  }
}

interface BoardContextType {
  state: BoardState
  dispatch: React.Dispatch<Action>
  activeBoard: Board | null
}

const BoardContext = createContext<BoardContextType | null>(null)

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { boards: {}, currentId: null })

  useEffect(() => {
    const { boards, currentId } = loadBoards()
    dispatch({ type: "LOAD", boards, currentId })
  }, [])

  useEffect(() => {
    if (state.currentId && Object.keys(state.boards).length > 0) {
      setCurrentId(state.currentId)
      saveBoards()
    }
  }, [state.boards, state.currentId])

  const activeBoard = state.currentId ? state.boards[state.currentId] ?? null : null

  return (
    <BoardContext.Provider value={{ state, dispatch, activeBoard }}>
      {children}
    </BoardContext.Provider>
  )
}

export function useBoardStore() {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error("useBoardStore must be used within BoardProvider")
  return ctx
}

export function useActiveSorter(): SorterBoard | null {
  const { activeBoard } = useBoardStore()
  if (activeBoard && activeBoard.type === "sorter") return activeBoard as SorterBoard
  return null
}

export function useActiveTimeline(): TimelineBoard | null {
  const { activeBoard } = useBoardStore()
  if (activeBoard && activeBoard.type === "timeline") return activeBoard as TimelineBoard
  return null
}

export function useCreateBoard() {
  const { dispatch, state } = useBoardStore()
  return useCallback(
    (type: BoardType, name: string) => {
      name = name.trim() || "Untitled"
      const id = genBoardId()
      const base: any = {
        id,
        name,
        type,
        iconColor: "#5E6AD2",
        createdAt: new Date().toISOString(),
      }
      if (type === "sorter") {
        base.cards = []
        base.columnConfig = loadDefaultConfig()
      } else {
        base.tasks = []
      }
      dispatch({ type: "CREATE", board: base as Board })
    },
    [dispatch]
  )
}

export function useDeleteBoard() {
  const { dispatch } = useBoardStore()
  return useCallback((id: string) => dispatch({ type: "DELETE", id }), [dispatch])
}

export function useRenameBoard() {
  const { dispatch } = useBoardStore()
  return useCallback((id: string, name: string) => dispatch({ type: "RENAME", id, name }), [dispatch])
}

export function useSwitchBoard() {
  const { dispatch } = useBoardStore()
  return useCallback((id: string) => dispatch({ type: "SET_ACTIVE", id }), [dispatch])
}

export function useSetIconColor() {
  const { dispatch } = useBoardStore()
  return useCallback((id: string, color: string) => dispatch({ type: "SET_ICON_COLOR", id, color }), [dispatch])
}

export function useSaveSorter() {
  const { dispatch, state } = useBoardStore()
  return useCallback(
    (board: SorterBoard) => {
      dispatch({ type: "UPDATE_SORTER", board })
    },
    [dispatch]
  )
}

export function useSaveTimeline() {
  const { dispatch } = useBoardStore()
  return useCallback(
    (board: TimelineBoard) => {
      dispatch({ type: "UPDATE_TIMELINE", board })
    },
    [dispatch]
  )
}
