import { useState, useEffect, useRef } from "react"
import { useTheme } from "./hooks/useTheme"
import {
  useBoardStore,
  useCreateBoard,
  useDeleteBoard,
  useRenameBoard,
  useSwitchBoard,
  useSetIconColor,
} from "./hooks/useBoardStore"
import { readShareHash, clearShareHash } from "./utils/share"
import { genBoardId } from "./utils/id"
import type { Board, BoardType, ShareData } from "./types"
import { SorterBoardView } from "./components/SorterBoard/SorterBoard"
import { TimelineBoardView } from "./components/TimelineBoard/TimelineBoard"
import { Overlay } from "./components/ui/Overlay"

const BOARD_ICONS: Record<BoardType, string> = {
  sorter: "layers",
  timeline: "calendar-range",
}

export function AppShell() {
  const { theme, toggle: toggleTheme } = useTheme()
  const { state, dispatch, activeBoard } = useBoardStore()
  const createBoard = useCreateBoard()
  const deleteBoard = useDeleteBoard()
  const renameBoard = useRenameBoard()
  const switchBoard = useSwitchBoard()
  const setIconColor = useSetIconColor()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("ps-sidebar-collapsed") === "true"
    } catch {
      return false
    }
  })
  const [boardMenuId, setBoardMenuId] = useState<string | null>(null)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createType, setCreateType] = useState<BoardType>("sorter")
  const [createName, setCreateName] = useState("")

  const [promptMode, setPromptMode] = useState<"create" | "rename">("create")
  const [promptId, setPromptId] = useState<string | null>(null)
  const [promptName, setPromptName] = useState("")
  const [promptOpen, setPromptOpen] = useState(false)

  const [shareOpen, setShareOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [shareJson, setShareJson] = useState("")
  const [shareCopied, setShareCopied] = useState(false)
  const [shareJsonCopied, setShareJsonCopied] = useState(false)

  const [importOpen, setImportOpen] = useState(false)
  const [importJson, setImportJson] = useState("")
  const [importError, setImportError] = useState("")

  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState<"text" | "json">("text")
  const [bulkText, setBulkText] = useState("")
  const [bulkJsonInput, setBulkJsonInput] = useState("")
  const [bulkError, setBulkError] = useState("")

  const [importBoardData, setImportBoardData] = useState<ShareData | null>(null)
  const [importBoardOpen, setImportBoardOpen] = useState(false)

  const resizeRef = useRef<number>(0)

  const boardList = Object.values(state.boards).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  useEffect(() => {
    const shared = readShareHash()
    if (shared) {
      setImportBoardData(shared)
      setImportBoardOpen(true)
    }
  }, [])

  useEffect(() => {
    if (!sidebarCollapsed) {
      localStorage.setItem("ps-sidebar-collapsed", "false")
    } else {
      localStorage.setItem("ps-sidebar-collapsed", "true")
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    const handleResize = () => {
      clearTimeout(resizeRef.current)
      resizeRef.current = window.setTimeout(() => {
        if (window.innerWidth > 768) {
          setSidebarOpen(false)
        }
      }, 150)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  function closeAllMenus() {
    setBoardMenuId(null)
  }

  function handleImportShared() {
    if (!importBoardData) return
    const data = importBoardData
    let name = data.name
    let count = 1
    const baseName = name
    while (Object.values(state.boards).some((b) => b.name === name)) {
      name = baseName + " (" + count++ + ")"
    }
    const id = genBoardId()
    const board: any = {
      id,
      name,
      type: data.type || "sorter",
      iconColor: "#5E6AD2",
      createdAt: new Date().toISOString(),
    }
    if (board.type === "sorter") {
      board.cards = data.cards || []
      board.columnConfig = data.columnConfig || null
    } else {
      board.tasks = data.tasks || []
    }
    dispatch({ type: "CREATE", board })
    setImportBoardOpen(false)
    setImportBoardData(null)
    clearShareHash()
  }

  function openCreateDialog() {
    setCreateType("sorter")
    setCreateName("")
    setCreateDialogOpen(true)
  }

  function handleCreate() {
    createBoard(createType, createName)
    setCreateDialogOpen(false)
  }

  function openRenamePrompt(id: string, currentName: string) {
    setPromptMode("rename")
    setPromptId(id)
    setPromptName(currentName)
    setPromptOpen(true)
  }

  function handlePromptConfirm() {
    if (promptMode === "rename" && promptId) {
      renameBoard(promptId, promptName)
    }
    setPromptOpen(false)
  }

  function openShareDialog() {
    if (!activeBoard) return
    const data: ShareData = {
      name: activeBoard.name,
      type: activeBoard.type,
    }
    if (activeBoard.type === "sorter") {
      data.cards = (activeBoard as any).cards
      data.columnConfig = (activeBoard as any).columnConfig
    } else {
      data.tasks = (activeBoard as any).tasks
    }
    const json = JSON.stringify(data, null, 2)
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))))
    const url = location.href.split("#")[0] + "#board=" + encodeURIComponent(encoded)
    setShareUrl(url)
    setShareJson(json)
    setShareCopied(false)
    setShareJsonCopied(false)
    setShareOpen(true)
  }

  function handleBulkImport() {
    setBulkMode("text")
    setBulkText("")
    setBulkJsonInput("")
    setBulkError("")
    setBulkOpen(true)
  }

  return (
    <>
      <div
        className="sidebar-overlay"
        style={{
          display: sidebarOpen ? "block" : "none",
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 49,
        }}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className="sidebar"
        style={{
          width: sidebarCollapsed ? 56 : 240,
          background: "var(--color-bg-nav)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          padding: "20px 12px 12px",
          gap: 4,
          overflowY: "auto",
          transition: "width 0.2s",
          position: "fixed" as any,
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transform: window.innerWidth <= 768 && !sidebarOpen ? "translateX(-100%)" : "none",
        } as any}
      >
        <div className="sidebar-header" style={{ display: "flex", flexDirection: sidebarCollapsed ? "column" : "row", alignItems: "center", gap: sidebarCollapsed ? 24 : 10, padding: sidebarCollapsed ? "20px 0 6px" : "4px 8px 14px", marginBottom: 10 }}>
          <button className="sidebar-collapse-btn" onClick={() => setSidebarCollapsed((s) => !s)} style={{ opacity: sidebarCollapsed ? 1 : 0, ...(sidebarCollapsed ? {} : { marginLeft: "auto" }) } as any}>
            <i data-lucide={sidebarCollapsed ? "chevron-right" : "chevron-left"} className="icon-xs" />
          </button>
          <div className="sidebar-logo" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 700, color: "var(--color-text)", letterSpacing: "-0.02em" }}>
            <i data-lucide="layers" className="icon-sm" style={{ color: "var(--color-accent)", width: 22, height: 22 }} />
            {!sidebarCollapsed && <span>Priority Sorter</span>}
          </div>
        </div>

        <button className="sidebar-btn" onClick={openCreateDialog} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 6, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.12s" }}>
          <i data-lucide="plus" className="icon-sm" />
          {!sidebarCollapsed && <span>New Board</span>}
        </button>

        <div className="board-list" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, minHeight: 0, padding: "2px 0", alignItems: sidebarCollapsed ? "center" : "stretch" }}>
          {boardList.map((b) => (
            <div
              key={b.id}
              className={`board-item${b.id === state.currentId ? " active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: sidebarCollapsed ? "7px 0" : "7px 8px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                color: b.id === state.currentId ? "var(--color-text)" : "var(--color-text-secondary)",
                background: b.id === state.currentId ? "var(--color-bg-surface)" : "transparent",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                transition: "all 0.12s",
              }}
              onClick={() => { switchBoard(b.id); if (window.innerWidth <= 768) setSidebarOpen(false) }}
              onDoubleClick={() => { if (!sidebarCollapsed) openRenamePrompt(b.id, b.name) }}
            >
              <i data-lucide={BOARD_ICONS[b.type]} className="board-item-icon" style={{ width: 16, height: 16, flexShrink: 0, color: b.id === state.currentId ? b.iconColor : "var(--color-text-secondary)" }} />
              {!sidebarCollapsed && (
                <span className="board-item-name" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
              )}
              {!sidebarCollapsed && (
                <div className="board-item-menu-wrapper" style={{ position: "relative", flexShrink: 0 }}>
                  <button
                    className="board-item-menu"
                    style={{ width: 22, height: 22, borderRadius: 4, border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onClick={(e) => { e.stopPropagation(); setBoardMenuId(boardMenuId === b.id ? null : b.id) }}
                  >
                    <i data-lucide="more-vertical" className="icon-xs" />
                  </button>
                  {boardMenuId === b.id && (
                    <div className="board-menu-dropdown" style={{ position: "absolute", right: 0, top: "100%", background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", zIndex: 30, minWidth: 130, overflow: "hidden" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", width: "100%", textAlign: "left" }}
                        onClick={() => { openRenamePrompt(b.id, b.name); setBoardMenuId(null) }}
                      ><i data-lucide="pencil" className="icon-xs" /> Rename</button>
                      <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", width: "100%", textAlign: "left" }}
                        onClick={() => { openShareDialogForBoard(b.id); setBoardMenuId(null) }}
                      ><i data-lucide="share-2" className="icon-xs" /> Share</button>
                      <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", border: "none", background: "transparent", color: "#f87171", fontSize: 12, cursor: "pointer", width: "100%", textAlign: "left" }}
                        onClick={() => { setPromptMode("delete"); setPromptId(b.id); setPromptName(b.name); setPromptOpen(true); setBoardMenuId(null) }}
                      ><i data-lucide="trash-2" className="icon-xs" /> Delete</button>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderTop: "1px solid var(--color-border)" }}>
                        <input type="color" value={b.iconColor} style={{ width: 24, height: 24, border: "none", borderRadius: 4, cursor: "pointer", padding: 0, background: "none" }}
                          onChange={(e) => { setIconColor(b.id, e.target.value); setBoardMenuId(null) }}
                        />
                        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Icon color</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ borderTop: "1px solid var(--color-border)", margin: "8px 0 4px" }} />
        <button className="sidebar-btn" onClick={toggleTheme} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 6, border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.12s", justifyContent: sidebarCollapsed ? "center" : "flex-start" }}>
          <i data-lucide={theme === "dark" ? "sun" : "moon"} className="icon-sm" />
          {!sidebarCollapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>
      </aside>

      <div className="main-area" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, marginLeft: window.innerWidth <= 768 ? 0 : (sidebarCollapsed ? 56 : 240) }}>
        <header className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-bg-page)", padding: "12px 24px", gap: 10, flexShrink: 0, borderBottom: "1px solid var(--color-border)" }}>
          <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)} style={{ display: window.innerWidth <= 768 ? "flex" : "none", width: 32, height: 32, borderRadius: 6, border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", alignItems: "center", justifyContent: "center" }}>
              <i data-lucide="menu" className="icon-sm" />
            </button>
          </div>
          <div className="controls" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <div className="dropdown-wrap" style={{ position: "relative", display: "inline-flex" }}>
              <button className="btn btn-ghost" id="importBulkBtn" onClick={(e) => { e.stopPropagation(); setBulkOpen((prev) => !prev) }}>
                <i data-lucide="chevron-down" className="icon-sm" /> Import
              </button>
            </div>
            <button className="btn btn-ghost" onClick={openShareDialog}><i data-lucide="share-2" className="icon-sm" /> Share</button>
            {activeBoard?.type === "sorter" && (
              <button className="btn btn-ghost" onClick={handleBulkImport}><i data-lucide="file-plus" className="icon-sm" /> Bulk import</button>
            )}
          </div>
        </header>

        <div className="app" style={{ padding: "24px 24px 0", display: "flex", flexDirection: "column", flex: 1, width: "100%", boxSizing: "border-box" }}>
          {!activeBoard && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--color-text-secondary)", fontSize: 14 }}>Create a board to get started</div>}
          {activeBoard?.type === "sorter" && activeBoard && (
            <SorterBoardView board={activeBoard as any} />
          )}
          {activeBoard?.type === "timeline" && activeBoard && (
            <TimelineBoardView board={activeBoard as any} />
          )}
        </div>
      </div>

      {/* Create Board Dialog */}
      <Overlay open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <div className="dialog-box" style={{ maxWidth: 420 }}>
          <h2>Create new board</h2>
          <p className="sub">Choose a board type and give it a name.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {(["sorter", "timeline"] as BoardType[]).map((t) => (
              <button
                key={t}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "16px 12px",
                  borderRadius: 8,
                  border: createType === t ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                  background: "var(--color-bg-page)",
                  cursor: "pointer",
                  transition: "all 0.12s",
                  color: "var(--color-text)",
                  fontSize: 13,
                }}
                onClick={() => setCreateType(t)}
              >
                <i data-lucide={BOARD_ICONS[t]} className="icon-sm" style={{ width: 24, height: 24, color: "var(--color-accent)" }} />
                <span style={{ fontWeight: 600 }}>{t === "sorter" ? "Priority Sorter" : "Timeline"}</span>
                <span style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>{t === "sorter" ? "Drag & drop card sorting" : "Gantt chart + task tree"}</span>
              </button>
            ))}
          </div>
          <input type="text" placeholder="Board name" value={createName} onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate() }}
            autoFocus
          />
          <div className="btns">
            <button className="btn" onClick={() => setCreateDialogOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate}>Create</button>
          </div>
        </div>
      </Overlay>

      {/* Rename / Delete Prompt */}
      <Overlay open={promptOpen} onClose={() => setPromptOpen(false)}>
        <div className="dialog-box" style={{ maxWidth: 360 }}>
          {promptMode === "rename" ? (
            <>
              <h2>Rename board</h2>
              <p className="sub">Enter a new name for the board.</p>
              <input type="text" value={promptName} onChange={(e) => setPromptName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handlePromptConfirm() }}
                autoFocus
              />
              <div className="btns">
                <button className="btn" onClick={() => setPromptOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handlePromptConfirm}>Save</button>
              </div>
            </>
          ) : (
            <>
              <h2>Delete board</h2>
              <p className="sub">Delete "{promptName}"? This cannot be undone.</p>
              <div className="btns">
                <button className="btn" onClick={() => setPromptOpen(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ background: "#f87171", borderColor: "#f87171" }}
                  onClick={() => { if (promptId) deleteBoard(promptId); setPromptOpen(false) }}
                >Delete</button>
              </div>
            </>
          )}
        </div>
      </Overlay>

      {/* Delete Board Prompt (unified above) */}

      {/* Share Dialog */}
      <Overlay open={shareOpen} onClose={() => setShareOpen(false)}>
        <div className="dialog-box" style={{ maxWidth: 480 }}>
          <h2>Share board</h2>
          <p className="sub">Share this board with your team.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input type="text" readOnly value={shareUrl} style={{ flex: 1, padding: "9px 12px", borderRadius: 7, border: "1px solid var(--color-border)", background: "var(--color-bg-page)", color: "var(--color-text)", fontSize: 13, outline: "none" }} />
            <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(shareUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }}>
              <i data-lucide="clipboard" className="icon-sm" /> {shareCopied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, color: "var(--color-text-secondary)", fontSize: 12 }}>
            <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
            or copy raw JSON
            <span style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
          </div>
          <textarea readOnly value={shareJson} style={{ width: "100%", height: 100, padding: 8, borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-bg-page)", color: "var(--color-text)", fontSize: 11, fontFamily: "var(--font-mono)", resize: "none", outline: "none", boxSizing: "border-box" }} />
          <div className="btns" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => { navigator.clipboard.writeText(shareJson); setShareJsonCopied(true); setTimeout(() => setShareJsonCopied(false), 2000) }}>
              <i data-lucide="clipboard" className="icon-sm" /> {shareJsonCopied ? "Copied!" : "Copy JSON"}
            </button>
            <button className="btn" onClick={() => setShareOpen(false)}>Close</button>
          </div>
        </div>
      </Overlay>

      {/* Import Shared Board Prompt */}
      <Overlay open={importBoardOpen} onClose={() => { setImportBoardOpen(false); clearShareHash() }}>
        <div className="dialog-box" style={{ maxWidth: 380 }}>
          <h2>Import shared board</h2>
          <p className="sub">"{importBoardData?.name}" was shared with you. Add it to your boards?</p>
          <div className="btns">
            <button className="btn" onClick={() => { setImportBoardOpen(false); clearShareHash() }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleImportShared}><i data-lucide="download" className="icon-sm" /> Import</button>
          </div>
        </div>
      </Overlay>

      {/* Paste Import Dialog */}
      <Overlay open={importOpen} onClose={() => setImportOpen(false)}>
        <div className="dialog-box" style={{ maxWidth: 440 }}>
          <h2>Import board from JSON</h2>
          <p className="sub">Paste the shared board JSON below.</p>
          <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)}
            style={{ width: "100%", height: 180, padding: 8, borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-bg-page)", color: "var(--color-text)", fontSize: 11, fontFamily: "var(--font-mono)", resize: "vertical", outline: "none", boxSizing: "border-box" }}
            placeholder='{"name":"Board 1","cards":[...],"columnConfig":{...}}'
          />
          {importError && <div style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "8px 12px", borderRadius: 6, marginBottom: 8 }}>{importError}</div>}
          <div className="btns">
            <button className="btn" onClick={() => setImportOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => {
              try {
                const data = JSON.parse(importJson)
                if (!data || !data.name) { setImportError("JSON must have a 'name' field."); return }
                let name = data.name
                let count = 1
                const base = name
                while (Object.values(state.boards).some((b) => b.name === name)) {
                  name = base + " (" + count++ + ")"
                }
                const id = genBoardId()
                const board: any = { id, name, type: data.type || "sorter", iconColor: "#5E6AD2", createdAt: new Date().toISOString() }
                if (board.type === "sorter") { board.cards = data.cards || []; board.columnConfig = data.columnConfig || null }
                else { board.tasks = data.tasks || [] }
                dispatch({ type: "CREATE", board })
                setImportOpen(false)
                setImportError("")
              } catch (e: any) { setImportError("Invalid JSON: " + e.message) }
            }}><i data-lucide="download" className="icon-sm" /> Import</button>
          </div>
        </div>
      </Overlay>

      {/* Close menu on outside click */}
      {boardMenuId && <div style={{ position: "fixed", inset: 0, zIndex: 29 }} onClick={closeAllMenus} />}
    </>
  )

  function openShareDialogForBoard(id: string) {
    const b = state.boards[id]
    if (!b) return
    const data: ShareData = { name: b.name, type: b.type } as any
    if (b.type === "sorter") { data.cards = (b as any).cards; data.columnConfig = (b as any).columnConfig }
    else { data.tasks = (b as any).tasks }
    const json = JSON.stringify(data, null, 2)
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))))
    const url = location.href.split("#")[0] + "#board=" + encodeURIComponent(encoded)
    setShareUrl(url)
    setShareJson(json)
    setShareCopied(false)
    setShareJsonCopied(false)
    setShareOpen(true)
  }
}
