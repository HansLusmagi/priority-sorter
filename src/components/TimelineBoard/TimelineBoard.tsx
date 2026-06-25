import { useMemo } from "react"
import type { TimelineBoard, TimelineTask } from "../../types"
import { useSaveTimeline } from "../../hooks/useBoardStore"
import { genTaskId } from "../../utils/id"
import { TaskTreePanel } from "./TaskTreePanel"
import { GanttChart } from "./GanttChart"
import { toDate } from "../../utils/dates"

interface Props {
  board: TimelineBoard
}

const ROOT_PALETTE = ["#5E6AD2", "#f87171", "#34d399", "#fb923c", "#a78bfa", "#22d3ee", "#f472b6", "#fbbf24"]

function getColor(index: number, level: number): string {
  const base = ROOT_PALETTE[index % ROOT_PALETTE.length]
  if (level === 0) return base
  const opacity = level === 1 ? 0.75 : 0.55
  return base + Math.round(opacity * 255).toString(16).padStart(2, "0")
}

export function flattenTasks(tasks: TimelineTask[], level: number = 0): { task: TimelineTask; level: number; parentId?: string }[] {
  const result: { task: TimelineTask; level: number; parentId?: string }[] = []
  for (const t of tasks) {
    result.push({ task: t, level, parentId: undefined })
    if (t.subtasks && t.subtasks.length > 0 && t.expanded !== false) {
      result.push(...flattenTasks(t.subtasks, level + 1))
    }
  }
  return result
}

export function updateTaskInTree(tasks: TimelineTask[], id: string, updater: (t: TimelineTask) => TimelineTask): TimelineTask[] {
  return tasks.map((t) => {
    if (t.id === id) return updater(t)
    if (t.subtasks && t.subtasks.length > 0) {
      return { ...t, subtasks: updateTaskInTree(t.subtasks, id, updater) }
    }
    return t
  })
}

export function deleteTaskFromTree(tasks: TimelineTask[], id: string): TimelineTask[] {
  return tasks.filter((t) => {
    if (t.id === id) return false
    if (t.subtasks && t.subtasks.length > 0) {
      t.subtasks = deleteTaskFromTree(t.subtasks, id)
    }
    return true
  })
}

export function addSubtaskToTree(tasks: TimelineTask[], parentId: string, task: TimelineTask): TimelineTask[] {
  return tasks.map((t) => {
    if (t.id === parentId) {
      return { ...t, subtasks: [...(t.subtasks || []), task], expanded: true }
    }
    if (t.subtasks && t.subtasks.length > 0) {
      return { ...t, subtasks: addSubtaskToTree(t.subtasks, parentId, task) }
    }
    return t
  })
}

export function reorderTasksInTree(tasks: TimelineTask[], fromId: string, toIndex: number): TimelineTask[] {
  const flat = flattenTasks(tasks)
  const fromIdx = flat.findIndex((f) => f.task.id === fromId)
  if (fromIdx < 0) return tasks
  const item = flat[fromIdx]
  const sourceLevel = item.level
  const siblings = sourceLevel === 0 ? tasks : []
  const fromSiblingIdx = sourceLevel === 0 ? tasks.findIndex((t) => t.id === fromId) : -1
  if (fromSiblingIdx < 0) return tasks
  const newTasks = [...tasks]
  const [moved] = newTasks.splice(fromSiblingIdx, 1)
  const targetIdx = Math.min(toIndex, newTasks.length)
  newTasks.splice(targetIdx, 0, moved)
  return newTasks
}

export function calcAutoProgress(task: TimelineTask): number {
  if (!task.subtasks || task.subtasks.length === 0) return task.progress
  const total = task.subtasks.reduce((sum, st) => {
    const p = st.subtasks && st.subtasks.length > 0 ? calcAutoProgress(st) : st.progress
    const duration = 1
    return sum + p * duration
  }, 0)
  const count = task.subtasks.reduce((sum, st) => {
    return sum + (st.subtasks && st.subtasks.length > 0 ? 1 : 1)
  }, 0)
  return count > 0 ? Math.round(total / count) : 0
}

export function cascadeDates(tasks: TimelineTask[]): TimelineTask[] {
  return tasks.map((t) => {
    if (t.subtasks && t.subtasks.length > 0) {
      const updated = cascadeDates(t.subtasks)
      const starts = updated.map((st) => toDate(st.start))
      const ends = updated.map((st) => toDate(st.end))
      const minS = new Date(Math.min(...starts.map((d) => d.getTime())))
      const maxE = new Date(Math.max(...ends.map((d) => d.getTime())))
      return { ...t, subtasks: updated, start: minS.toISOString().slice(0, 10), end: maxE.toISOString().slice(0, 10) }
    }
    return t
  })
}

export function TimelineBoardView({ board }: Props) {
  const saveTimeline = useSaveTimeline()
  const tasks = board.tasks || []

  function updateTasks(updated: TimelineTask[]) {
    saveTimeline({ ...board, tasks: updated })
  }

  function addRootTask(name: string) {
    if (!name.trim()) return
    const now = new Date()
    const start = now.toISOString().slice(0, 10)
    const end = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)
    const task: TimelineTask = {
      id: genTaskId(),
      name: name.trim(),
      start,
      end,
      progress: 0,
      color: getColor(tasks.length, 0),
      milestone: false,
      expanded: true,
      subtasks: [],
    }
    updateTasks([...tasks, task])
  }

  function updateTask(id: string, updater: (t: TimelineTask) => TimelineTask) {
    let updated = updateTaskInTree(tasks, id, updater)
    updated = cascadeDates(updated)
    updateTasks(updated)
  }

  function deleteTask(id: string) {
    updateTasks(deleteTaskFromTree(tasks, id))
  }

  function addSubtask(parentId: string) {
    const name = "New subtask"
    const now = new Date()
    const start = now.toISOString().slice(0, 10)
    const end = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10)
    const parent = findTask(tasks, parentId)
    const index = parent ? tasks.indexOf(parent) : 0
    const task: TimelineTask = {
      id: genTaskId(),
      name,
      start,
      end,
      progress: 0,
      color: getColor(index, 1),
      milestone: false,
      expanded: true,
      subtasks: [],
    }
    updateTasks(addSubtaskToTree(tasks, parentId, task))
  }

  function reorderTask(fromId: string, toIndex: number) {
    updateTasks(reorderTasksInTree(tasks, fromId, toIndex))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="btn btn-primary" onClick={() => addRootTask("")}>
          <i data-lucide="plus" className="icon-sm" /> Add task
        </button>
      </div>
      <div style={{ display: "flex", flex: 1, minHeight: 0, gap: 0, border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ width: "40%", minWidth: 300, borderRight: "1px solid var(--color-border)", overflowY: "auto", background: "var(--color-bg-surface)" }}>
          <TaskTreePanel
            tasks={tasks}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddSubtask={addSubtask}
            onReorderTask={reorderTask}
          />
        </div>
        <div style={{ flex: 1, overflow: "auto", background: "var(--color-bg-surface)" }}>
          <GanttChart
            tasks={tasks}
            onUpdateTask={updateTask}
          />
        </div>
      </div>
    </div>
  )
}

function findTask(tasks: TimelineTask[], id: string): TimelineTask | null {
  for (const t of tasks) {
    if (t.id === id) return t
    if (t.subtasks) {
      const found = findTask(t.subtasks, id)
      if (found) return found
    }
  }
  return null
}
