import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import type { TimelineTask } from "../../types"
import { toDate, dayDiff, addDaysStr, fmt } from "../../utils/dates"
import { flattenTasks } from "./TimelineBoard"
import { addDays, format, startOfWeek, startOfMonth, differenceInDays } from "date-fns"

type ZoomLevel = "day" | "week" | "month"

interface Props {
  tasks: TimelineTask[]
  onUpdateTask: (id: string, updater: (t: TimelineTask) => TimelineTask) => void
}

function getDateRange(tasks: TimelineTask[]): { start: Date; end: Date } {
  const flat = flattenTasks(tasks).map((f) => f.task)
  if (flat.length === 0) {
    const now = new Date()
    return { start: now, end: addDays(now, 30) }
  }
  let min = toDate(flat[0].start)
  let max = toDate(flat[0].end)
  for (const t of flat) {
    const s = toDate(t.start)
    const e = toDate(t.end)
    if (s < min) min = s
    if (e > max) max = e
  }
  return { start: min, end: addDays(max, 7) }
}

export function GanttChart({ tasks, onUpdateTask }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>("week")

  const { start, end } = useMemo(() => getDateRange(tasks), [tasks])
  const totalDays = useMemo(() => Math.max(1, differenceInDays(end, start)), [start, end])

  const dayWidth = useMemo(() => {
    switch (zoom) {
      case "day": return 60
      case "week": return 30
      case "month": return 12
    }
  }, [zoom])

  const chartWidth = totalDays * dayWidth
  const rowHeight = 36
  const flat = useMemo(() => flattenTasks(tasks), [tasks])
  const today = new Date()
  const todayOffset = differenceInDays(today, start) * dayWidth

  function getHeaderLabels(): { label: string; offset: number; width: number }[] {
    const labels: { label: string; offset: number; width: number }[] = []
    if (zoom === "day") {
      for (let i = 0; i < totalDays; i++) {
        const d = addDays(start, i)
        labels.push({ label: format(d, "d"), offset: i * dayWidth, width: dayWidth })
      }
    } else if (zoom === "week") {
      let cursor = startOfWeek(start, { weekStartsOn: 1 })
      while (cursor < end) {
        const next = addDays(cursor, 7)
        const w = differenceInDays(next > end ? end : next, cursor) * dayWidth
        labels.push({ label: format(cursor, "MMM d"), offset: differenceInDays(cursor, start) * dayWidth, width: Math.max(dayWidth, w) })
        cursor = next
      }
    } else {
      let cursor = startOfMonth(start)
      while (cursor < end) {
        const next = addDays(startOfMonth(addDays(cursor, 32)), 0)
        const w = differenceInDays(next > end ? end : next, cursor) * dayWidth
        labels.push({ label: format(cursor, "MMM yyyy"), offset: differenceInDays(cursor, start) * dayWidth, width: Math.max(dayWidth, w) })
        cursor = next
      }
    }
    return labels
  }

  const headerLabels = useMemo(getHeaderLabels, [zoom, start, end, totalDays, dayWidth])

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--color-border)", alignItems: "center" }}>
        {(["day", "week", "month"] as ZoomLevel[]).map((z) => (
          <button key={z} className={zoom === z ? "btn btn-primary" : "btn btn-ghost"}
            style={{ fontSize: 11, padding: "4px 8px" }}
            onClick={() => setZoom(z)}
          >{z.charAt(0).toUpperCase() + z.slice(1)}</button>
        ))}
      </div>
      <div style={{ overflowX: "auto", flex: 1 }}>
        <div style={{ minWidth: chartWidth, position: "relative" }}>
          {/* Header */}
          <div style={{ display: "flex", height: 28, borderBottom: "1px solid var(--color-border)", position: "sticky", top: 0, background: "var(--color-bg-surface)", zIndex: 5 }}>
            {headerLabels.map((h, i) => (
              <div key={i} style={{ width: h.width, minWidth: h.width, padding: "4px 4px", fontSize: 10, color: "var(--color-text-secondary)", borderRight: "1px solid var(--color-border)", boxSizing: "border-box", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {h.label}
              </div>
            ))}
          </div>

          {/* Today line */}
          {todayOffset >= 0 && todayOffset <= chartWidth && (
            <div style={{ position: "absolute", top: 0, bottom: 0, left: todayOffset, width: 2, background: "#f87171", zIndex: 3, pointerEvents: "none" }} />
          )}

          {/* Rows */}
          {flat.map(({ task, level }, idx) => {
            const left = dayDiff(task.start, fmt(start)) * dayWidth
            const width = Math.max(dayWidth, dayDiff(task.end, task.start) * dayWidth + dayWidth)
            const top = idx * rowHeight + 28
            return (
              <div key={task.id} style={{ position: "absolute", top, left: 0, right: 0, height: rowHeight, borderBottom: "1px solid var(--color-border)" }}>
                <GanttBar
                  task={task}
                  level={level}
                  left={left}
                  width={width}
                  dayWidth={dayWidth}
                  onUpdate={(id, startDate, endDate) => {
                    onUpdateTask(id, (t) => ({ ...t, start: startDate, end: endDate }))
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function GanttBar({
  task, level, left, width, dayWidth, onUpdate,
}: {
  task: TimelineTask
  level: number
  left: number
  width: number
  dayWidth: number
  onUpdate: (id: string, start: string, end: string) => void
}) {
  const [dragging, setDragging] = useState<"start" | "end" | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragStartLeft = useRef(0)
  const dragStartWidth = useRef(0)

  const onMouseDown = useCallback(
    (edge: "start" | "end") => (e: React.MouseEvent) => {
      e.preventDefault()
      setDragging(edge)
      dragStartX.current = e.clientX
      dragStartLeft.current = left
      dragStartWidth.current = width
    },
    [left, width]
  )

  useEffect(() => {
    if (!dragging) return
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartX.current
      const daysDelta = Math.round(dx / dayWidth)
      if (dragging === "start") {
        const newStart = addDaysStr(task.start, daysDelta)
        if (newStart < task.end) {
          onUpdate(task.id, newStart, task.end)
        }
      } else {
        const newEnd = addDaysStr(task.end, daysDelta)
        if (newEnd > task.start) {
          onUpdate(task.id, task.start, newEnd)
        }
      }
      dragStartX.current = e.clientX
    }
    const handleUp = () => {
      setDragging(null)
    }
    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleUp)
    return () => {
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleUp)
    }
  }, [dragging, task, dayWidth, onUpdate])

  return (
    <div ref={barRef} style={{ position: "absolute", left, top: 4, width, height: rowHeight - 8, cursor: "pointer" }}>
      {/* Invisible edge handles */}
      <div
        onMouseDown={onMouseDown("start")}
        style={{ position: "absolute", left: -4, top: 0, width: 10, height: "100%", cursor: "ew-resize", zIndex: 2 }}
      />
      <div
        onMouseDown={onMouseDown("end")}
        style={{ position: "absolute", right: -4, top: 0, width: 10, height: "100%", cursor: "ew-resize", zIndex: 2 }}
      />
      {/* Visible bar */}
      <div
        style={{
          height: "100%",
          borderRadius: 4,
          background: task.color,
          opacity: 0.85,
          display: "flex",
          alignItems: "center",
          padding: "0 6px",
          fontSize: 11,
          color: "#fff",
          fontWeight: 500,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          position: "relative",
        }}
      >
        {width > dayWidth * 2 && <span style={{ opacity: 0.9 }}>{task.name}</span>}
        {/* Progress overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: Math.min(100, task.progress) + "%",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 4,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  )
}
