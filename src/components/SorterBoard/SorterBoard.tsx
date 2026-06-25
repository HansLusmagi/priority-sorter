import { useState, useEffect, useRef, useCallback } from "react"
import type { SorterBoard, SorterCard, ColumnConfigEntry } from "../../types"
import { COLUMN_KEYS, IMPACT, COLOR_SWATCHES } from "../../types"
import { useSaveSorter } from "../../hooks/useBoardStore"
import { uid } from "../../utils/id"
import { Overlay } from "../ui/Overlay"

interface Props {
  board: SorterBoard
}

export function SorterBoardView({ board }: Props) {
  const saveSorter = useSaveSorter()
  const cards = board.cards || []
  const columnConfig = board.columnConfig || {}

  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ key: string; x: number; y: number } | null>(null)
  const [iconDialog, setIconDialog] = useState<{ key: string; search: string } | null>(null)
  const [colorDialog, setColorDialog] = useState<{ key: string } | null>(null)
  const [nameEditKey, setNameEditKey] = useState<string | null>(null)
  const [nameEditValue, setNameEditValue] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addText, setAddText] = useState("")
  const [addCol, setAddCol] = useState<string>("uncategorized")
  const [noteDialog, setNoteDialog] = useState<{ cardId: string; index: number; value: string } | null>(null)

  function updateCards(updated: SorterCard[]) {
    saveSorter({ ...board, cards: updated })
  }

  function addCard(text: string, column?: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const newCard: SorterCard = { id: uid(), text: trimmed, column: column || "uncategorized", notes: [] }
    updateCards([...cards, newCard])
  }

  function deleteCard(id: string) {
    updateCards(cards.filter((c) => c.id !== id))
  }

  function moveCard(id: string, targetCol: string) {
    updateCards(cards.map((c) => (c.id === id ? { ...c, column: targetCol } : c)))
  }

  function toggleNote(id: string) {
    updateCards(cards.map((c) => (c.id === id ? { ...c, _expanded: !c._expanded, _addingNote: c._expanded ? false : c._addingNote } : c)))
  }

  function setAddingNote(id: string, val: boolean) {
    updateCards(cards.map((c) => (c.id === id ? { ...c, _addingNote: val, _expanded: val ? true : c._expanded } : c)))
  }

  function addNote(id: string, text: string) {
    if (!text.trim()) return
    updateCards(cards.map((c) => (c.id === id ? { ...c, notes: [...c.notes, text.trim()], _addingNote: false } : c)))
  }

  function editNote(cardId: string, index: number, text: string) {
    updateCards(cards.map((c) => (c.id === cardId ? { ...c, notes: c.notes.map((n, i) => (i === index ? text : n)) } : c)))
  }

  function deleteNote(cardId: string, index: number) {
    updateCards(cards.map((c) => (c.id === cardId ? { ...c, notes: c.notes.filter((_, i) => i !== index) } : c)))
  }

  function getColumnCards(key: string) {
    return cards.filter((c) => c.column === key)
  }

  function esc(s: string) {
    const d = document.createElement("div")
    d.appendChild(document.createTextNode(s))
    return d.innerHTML
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="columns" style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLUMN_KEYS.length}, 1fr)`,
        gap: 16,
        flex: 1,
        minHeight: 0,
      }}>
        {COLUMN_KEYS.map((key) => {
          const cfg = columnConfig[key]
          const items = getColumnCards(key)
          return (
            <div
              key={key}
              className={`col ${dragOverCol === key ? "drag-over" : ""}`}
              data-col={key}
              style={{
                background: "var(--color-bg-surface)",
                borderRadius: 6,
                display: "flex",
                flexDirection: "column",
                transition: "border-color 0.12s",
                outline: dragOverCol === key ? "2px solid var(--color-accent)" : "none",
                outlineOffset: -2,
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(key) }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => { e.preventDefault(); setDragOverCol(null); const id = e.dataTransfer.getData("text/plain"); if (id) moveCard(id, key) }}
              onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ key, x: e.clientX, y: e.clientY }) }}
            >
              <div className="col-header" style={{ padding: "14px 16px 12px", fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 8, letterSpacing: "-0.01em" }}>
                <i data-lucide={cfg?.icon || "inbox"} className="col-icon" style={{ width: 16, height: 16, flexShrink: 0, color: cfg?.color }} />
                <span style={{ fontWeight: 500, color: cfg?.color }}>{cfg?.label || key}</span>
                <span className="count" style={{ fontWeight: 400, color: "var(--color-text-secondary)", fontSize: 12, marginLeft: "auto" }}>{items.length}</span>
                <button className="col-header-add" onClick={() => { setAddCol(key); setAddText(""); setAddDialogOpen(true) }}
                  style={{ width: 20, height: 20, borderRadius: 4, border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 1 }}>
                  <i data-lucide="plus" className="icon-xs" />
                </button>
              </div>
              <div className="col-body" style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", gap: 8, minHeight: 80 }}>
                {items.length === 0 ? (
                  <div className="empty-state" style={{ color: "var(--color-text-secondary)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>Drop cards here</div>
                ) : (
                  items.map((c) => {
                    const hasNotes = c.notes && c.notes.length > 0
                    return (
                      <div
                        key={c.id}
                        className="card"
                        draggable
                        style={{
                          background: "var(--color-bg-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 6,
                          fontSize: 13,
                          overflow: "hidden",
                          userSelect: "none",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                          opacity: dragging === c.id ? 0.3 : 1,
                        }}
                        onDragStart={(e) => {
                          setDragging(c.id)
                          e.dataTransfer.effectAllowed = "move"
                          e.dataTransfer.setData("text/plain", c.id)
                          const ghost = e.currentTarget.cloneNode(true) as HTMLElement
                          ghost.style.position = "fixed"
                          ghost.style.top = "-9999px"
                          ghost.style.pointerEvents = "none"
                          document.body.appendChild(ghost)
                          const rect = e.currentTarget.getBoundingClientRect()
                          e.dataTransfer.setDragImage(ghost, e.clientX - rect.left, e.clientY - rect.top)
                          setTimeout(() => document.body.removeChild(ghost), 0)
                        }}
                        onDragEnd={() => setDragging(null)}
                      >
                        <div className="card-main" style={{ padding: "9px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                          <i data-lucide={cfg?.icon || "inbox"} className="card-icon" style={{ width: 14, height: 14, flexShrink: 0, color: cfg?.color }} />
                          <span className="card-text" style={{ flex: 1, minWidth: 0, wordBreak: "break-word", lineHeight: 1.4 }}>{c.text}</span>
                          <div className="card-actions" style={{ display: "flex", gap: 4 }}>
                            <button className="del" onClick={() => deleteCard(c.id)}
                              style={{ width: 22, height: 22, borderRadius: 4, border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                              <i data-lucide="trash-2" className="icon-xs" />
                            </button>
                          </div>
                        </div>
                        <div className="card-note-bar" style={{ padding: "0 6px 6px" }}>
                          <span
                            className="note-toggle"
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleNote(c.id)}
                            style={{ fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 4px", borderRadius: 4, transition: "background 0.12s" }}
                          >
                            <i data-lucide={c._expanded ? "chevron-down" : (hasNotes ? "chevron-right" : "plus")} className="icon-xs" />
                            {c._expanded ? (hasNotes ? " Notes (" + c.notes.length + ")" : " Add note") : (hasNotes ? " Notes (" + c.notes.length + ")" : " Add note")}
                          </span>
                        </div>
                        {c._expanded && (
                          <div className="card-note" style={{ borderTop: "1px solid var(--color-border)", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                            {hasNotes && c.notes.map((note, idx) => (
                              <div key={idx} className="note-item" style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: "var(--color-text-secondary)", padding: "4px 0" }}>
                                <span style={{ flex: 1, lineHeight: 1.4 }}>{note}</span>
                                <div className="note-actions-wrapper" style={{ position: "relative", flexShrink: 0 }}>
                                  <button className="note-menu-btn" style={{ width: 20, height: 20, borderRadius: 3, border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                    onClick={(e) => { e.stopPropagation(); const dd = e.currentTarget.nextElementSibling; if (dd) dd.classList.toggle("open") }}
                                  ><i data-lucide="more-vertical" className="icon-xs" /></button>
                                  <div className="note-menu-dropdown" style={{ display: "none", position: "absolute", right: 0, top: "100%", background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: 5, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", zIndex: 20, minWidth: 100, overflow: "hidden" }}>
                                    <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 11, cursor: "pointer", width: "100%", textAlign: "left" }}
                                      onClick={() => { setNoteDialog({ cardId: c.id, index: idx, value: note }); closeNoteMenus() }}
                                    ><i data-lucide="pencil" className="icon-xs" /> Edit</button>
                                    <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", border: "none", background: "transparent", color: "#f87171", fontSize: 11, cursor: "pointer", width: "100%", textAlign: "left" }}
                                      onClick={() => { deleteNote(c.id, idx); closeNoteMenus() }}
                                    ><i data-lucide="trash-2" className="icon-xs" /> Remove</button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {c._addingNote ? (
                              <div className="inline-note-area" style={{ display: "flex", gap: 6 }}>
                                <textarea placeholder="Write a note..." rows={1} style={{ flex: 1, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--color-border)", background: "var(--color-bg-page)", color: "var(--color-text)", fontSize: 12, fontFamily: "inherit", resize: "none", outline: "none" }}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(c.id, (e.target as HTMLTextAreaElement).value) } }}
                                  autoFocus
                                />
                                <button className="inline-note-check" style={{ width: 22, height: 22, borderRadius: 4, border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                  onClick={(e) => { const ta = (e.currentTarget.parentNode as HTMLElement).querySelector("textarea"); if (ta) addNote(c.id, ta.value) }}
                                ><i data-lucide="check" className="icon-sm" /></button>
                              </div>
                            ) : (
                              <button className="add-note-btn" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 6px", borderRadius: 4, border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer" }}
                                onClick={() => setAddingNote(c.id, true)}
                              ><i data-lucide="plus" className="icon-xs" /> Add note</button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <button className="col-add-btn" onClick={() => { setAddCol(key); setAddText(""); setAddDialogOpen(true) }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 6, border: "1px dashed var(--color-border)", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", marginTop: "auto", transition: "all 0.12s" }}>
                  <i data-lucide="plus" className="icon-xs" /> Add card
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Card Dialog */}
      <Overlay open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <div className="dialog-box">
          <h2>Add a card</h2>
          <p className="sub">Type the card text and click Add.</p>
          <input type="text" value={addText} onChange={(e) => setAddText(e.target.value)}
            placeholder="What should this card say?" autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") { addCard(addText, addCol); setAddText(""); setAddDialogOpen(false) } }}
          />
          <div className="btns">
            <button className="btn" onClick={() => setAddDialogOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { addCard(addText, addCol); setAddText(""); setAddDialogOpen(false) }}>Add</button>
          </div>
        </div>
      </Overlay>

      {/* Note Edit Dialog */}
      <Overlay open={noteDialog !== null} onClose={() => setNoteDialog(null)}>
        <div className="dialog-box">
          <h2>Edit note</h2>
          <p className="sub">Edit the note text.</p>
          <textarea value={noteDialog?.value || ""} onChange={(e) => setNoteDialog(noteDialog ? { ...noteDialog, value: e.target.value } : null)}
            style={{ width: "100%", minHeight: 60, padding: "9px 12px", borderRadius: 7, border: "1px solid var(--color-border)", background: "var(--color-bg-page)", color: "var(--color-text)", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }}
            autoFocus
          />
          <div className="btns">
            <button className="btn" onClick={() => setNoteDialog(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { if (noteDialog) { editNote(noteDialog.cardId, noteDialog.index, noteDialog.value); setNoteDialog(null) } }}>Save</button>
          </div>
        </div>
      </Overlay>

      {/* Context Menu */}
      {ctxMenu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={() => setCtxMenu(null)} />
          <div className="ctx-menu" style={{
            position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 40,
            background: "var(--color-bg-surface)", border: "1px solid var(--color-border)",
            borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", padding: 8, minWidth: 200,
          }}>
            {(() => {
              const cfg = columnConfig[ctxMenu.key]
              const key = ctxMenu.key
              return (
                <>
                  <div className="ctx-section" style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="text" defaultValue={cfg?.label || key} style={{ flex: 1, padding: "6px 8px", borderRadius: 5, border: "1px solid var(--color-border)", background: "var(--color-bg-page)", color: "var(--color-text)", fontSize: 12, outline: "none" }}
                        onChange={(e) => { setNameEditKey(key); setNameEditValue(e.target.value) }}
                        onKeyDown={(e) => { if (e.key === "Enter" && nameEditValue.trim()) { const cfg2 = { ...columnConfig, [key]: { ...columnConfig[key], label: nameEditValue.trim() } }; saveSorter({ ...board, columnConfig: cfg2 }); setCtxMenu(null) } }}
                      />
                    </div>
                  </div>
                  <div className="ctx-section" style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Icon</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="ctx-preview-icon"><i data-lucide={cfg?.icon || "inbox"} className="icon-sm" /></span>
                      <span style={{ flex: 1 }} />
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => { setIconDialog({ key, search: "" }); setCtxMenu(null) }}>Change</button>
                    </div>
                  </div>
                  <div className="ctx-section">
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Color</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="ctx-preview-swatch" style={{ width: 16, height: 16, borderRadius: 4, background: cfg?.color, flexShrink: 0 }} />
                      <span className="ctx-preview-hex" style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{cfg?.color}</span>
                      <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => { setColorDialog({ key }); setCtxMenu(null) }}>Change</button>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </>
      )}

      {/* Icon Picker Dialog */}
      {iconDialog && (
        <IconPickerDialog
          key={iconDialog.key}
          initialSearch={iconDialog.search}
          currentIcon={columnConfig[iconDialog.key]?.icon || "inbox"}
          onSelect={(icon) => {
            const cfg = { ...columnConfig, [iconDialog.key]: { ...columnConfig[iconDialog.key], icon } }
            saveSorter({ ...board, columnConfig: cfg })
            setIconDialog(null)
          }}
          onClose={() => setIconDialog(null)}
        />
      )}

      {/* Color Picker Dialog */}
      {colorDialog && (
        <ColorPickerDialog
          currentColor={columnConfig[colorDialog.key]?.color || "#6B7280"}
          onSelect={(color) => {
            const cfg = { ...columnConfig, [colorDialog.key]: { ...columnConfig[colorDialog.key], color } }
            saveSorter({ ...board, columnConfig: cfg })
            setColorDialog(null)
          }}
          onClose={() => setColorDialog(null)}
        />
      )}
    </div>
  )

  function closeNoteMenus() {
    document.querySelectorAll(".note-menu-dropdown.open").forEach((el) => el.classList.remove("open"))
  }
}

function IconPickerDialog({ currentIcon, onSelect, onClose }: { currentIcon: string; initialSearch: string; key: string; onSelect: (icon: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("")
  const [icons, setIcons] = useState<string[]>([])

  useEffect(() => {
    import("lucide-react").then((mod) => {
      const names = Object.keys(mod).filter((k) => typeof mod[k] === "object" || typeof mod[k] === "function")
      const kebab = names.map((n) => n.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase())
      setIcons(kebab)
    })
  }, [])

  const filtered = search ? icons.filter((i) => i.includes(search.toLowerCase())) : icons.slice(0, 60)

  return (
    <Overlay open onClose={onClose}>
      <div className="dialog-box" style={{ maxWidth: 400 }}>
        <h2>Choose icon</h2>
        <p className="sub">Pick an icon for the column.</p>
        <input type="text" placeholder="Search icons..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "6px 8px", borderRadius: 5, border: "1px solid var(--color-border)", background: "var(--color-bg-page)", color: "var(--color-text)", fontSize: 12, outline: "none", boxSizing: "border-box" }}
          autoFocus
        />
        <div className="ctx-icon-grid" style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 180, overflowY: "auto", marginTop: 8 }}>
          {filtered.map((icon) => (
            <button key={icon} className={`ctx-icon-btn ${icon === currentIcon ? "active" : ""}`}
              style={{
                width: 30, height: 30, borderRadius: 5, border: icon === currentIcon ? "1px solid var(--color-accent)" : "1px solid transparent",
                background: icon === currentIcon ? "var(--color-accent-muted)" : "var(--color-bg-page)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", color: icon === currentIcon ? "var(--color-accent)" : "var(--color-text-secondary)",
              }}
              onClick={() => { onSelect(icon); onClose() }}
              title={icon}
            >
              <i data-lucide={icon} className="icon-xs" />
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  )
}

function ColorPickerDialog({ currentColor, onSelect, onClose }: { currentColor: string; onSelect: (color: string) => void; onClose: () => void }) {
  const [color, setColor] = useState(currentColor)

  return (
    <Overlay open onClose={onClose}>
      <div className="dialog-box" style={{ maxWidth: 350 }}>
        <h2>Pick color</h2>
        <p className="sub">Choose a color for the column.</p>
        <div className="ctx-color-row" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            style={{ width: 36, height: 32, border: "none", borderRadius: 4, cursor: "pointer", padding: 0, background: "none" }}
          />
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{color}</span>
        </div>
        <div className="ctx-swatches" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {COLOR_SWATCHES.map((c) => (
            <div key={c} className="ctx-swatch"
              style={{
                width: 28, height: 28, borderRadius: 5, border: c === color ? "2px solid var(--color-text)" : "2px solid transparent",
                background: c, cursor: "pointer", transition: "border-color 0.12s",
              }}
              onClick={() => { setColor(c); onSelect(c); onClose() }}
            />
          ))}
        </div>
        <div className="btns" style={{ marginTop: 12 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onSelect(color); onClose() }}>Save</button>
        </div>
      </div>
    </Overlay>
  )
}


