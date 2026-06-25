import { useState, useRef } from "react"
import type { TimelineTask } from "../../types"
import { calcAutoProgress } from "./TimelineBoard"

interface Props {
  tasks: TimelineTask[]
  onUpdateTask: (id: string, updater: (t: TimelineTask) => TimelineTask) => void
  onDeleteTask: (id: string) => void
  onAddSubtask: (parentId: string) => void
  onReorderTask: (fromId: string, toIndex: number) => void
}

export function TaskTreePanel({ tasks, onUpdateTask, onDeleteTask, onAddSubtask, onReorderTask }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  function renderTasks(taskList: TimelineTask[], level: number = 0): JSX.Element[] {
    return taskList.map((t, idx) => (
      <div key={t.id}>
        <div
          className="task-tree-item"
          draggable={level === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            paddingLeft: 16 + level * 20,
            fontSize: 13,
            borderBottom: "1px solid var(--color-border)",
            background: dragOverId === t.id ? "var(--color-bg-surface-hover)" : "transparent",
            cursor: "pointer",
            transition: "background 0.12s",
            opacity: dragId === t.id ? 0.3 : 1,
          }}
          onDragStart={(e) => {
            if (level !== 0) { e.preventDefault(); return }
            setDragId(t.id)
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("text/plain", t.id)
          }}
          onDragOver={(e) => {
            if (level !== 0) return
            e.preventDefault()
            setDragOverId(t.id)
          }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOverId(null)
            const fromId = e.dataTransfer.getData("text/plain")
            if (fromId && fromId !== t.id) {
              const siblings = taskList
              const toIndex = siblings.indexOf(t)
              onReorderTask(fromId, toIndex)
            }
            setDragId(null)
          }}
          onDragEnd={() => { setDragId(null); setDragOverId(null) }}
        >
          {t.subtasks && t.subtasks.length > 0 && (
            <button
              style={{ width: 18, height: 18, borderRadius: 3, border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, padding: 0 }}
              onClick={() => onUpdateTask(t.id, (task) => ({ ...task, expanded: !task.expanded }))}
            >
              <i data-lucide={t.expanded !== false ? "chevron-down" : "chevron-right"} className="icon-xs" />
            </button>
          )}
          {(!t.subtasks || t.subtasks.length === 0) && <div style={{ width: 18 }} />}
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingId === t.id ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => { if (editValue.trim()) onUpdateTask(t.id, (task) => ({ ...task, name: editValue.trim() })); setEditingId(null) }}
                onKeyDown={(e) => { if (e.key === "Enter") { if (editValue.trim()) onUpdateTask(t.id, (task) => ({ ...task, name: editValue.trim() })); setEditingId(null) } if (e.key === "Escape") setEditingId(null) }}
                style={{ width: "100%", padding: "2px 4px", borderRadius: 3, border: "1px solid var(--color-accent)", background: "var(--color-bg-page)", color: "var(--color-text)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                autoFocus
              />
            ) : (
              <span style={{ fontWeight: level === 0 ? 600 : 400 }} onDoubleClick={() => { setEditingId(t.id); setEditValue(t.name) }}>{t.name}</span>
            )}
          </div>
          <input
            type="date"
            value={t.start}
            onChange={(e) => onUpdateTask(t.id, (task) => ({ ...task, start: e.target.value }))}
            style={{ width: 110, padding: "2px 4px", borderRadius: 3, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text)", fontSize: 11, outline: "none", fontFamily: "inherit" }}
          />
          <span style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>→</span>
          <input
            type="date"
            value={t.end}
            onChange={(e) => onUpdateTask(t.id, (task) => ({ ...task, end: e.target.value }))}
            style={{ width: 110, padding: "2px 4px", borderRadius: 3, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text)", fontSize: 11, outline: "none", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 4, width: 80 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--color-border)" }}>
              <div style={{ height: "100%", borderRadius: 2, background: t.color, width: Math.min(100, t.progress) + "%", transition: "width 0.2s" }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary)", width: 28, textAlign: "right" }}>
              {t.subtasks && t.subtasks.length > 0 && !t.progressLocked ? calcAutoProgress(t) : t.progress}%
            </span>
            {t.subtasks && t.subtasks.length > 0 && (
              <button
                style={{ width: 16, height: 16, borderRadius: 3, border: "none", background: "transparent", color: t.progressLocked ? "var(--color-accent)" : "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontSize: 10 }}
                onClick={() => onUpdateTask(t.id, (task) => ({ ...task, progressLocked: !task.progressLocked }))}
                title={t.progressLocked ? "Auto-calculate progress" : "Lock progress (manual)"}
              >
                <i data-lucide={t.progressLocked ? "lock" : "unlock"} className="icon-xs" />
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            <button className="task-action-btn"
              style={{ width: 20, height: 20, borderRadius: 3, border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              onClick={() => onAddSubtask(t.id)}
              title="Add subtask"
            >
              <i data-lucide="plus" className="icon-xs" />
            </button>
            <button className="task-action-btn"
              style={{ width: 20, height: 20, borderRadius: 3, border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              onClick={() => onDeleteTask(t.id)}
              title="Delete task"
            >
              <i data-lucide="trash-2" className="icon-xs" />
            </button>
          </div>
        </div>
        {t.subtasks && t.subtasks.length > 0 && t.expanded !== false && renderTasks(t.subtasks, level + 1)}
      </div>
    ))
  }

  if (tasks.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
        No tasks yet. Click "Add task" to get started.
      </div>
    )
  }

  return <div>{renderTasks(tasks)}</div>
}
