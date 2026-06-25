import type { ReactNode } from "react"

interface OverlayProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function Overlay({ open, onClose, children }: OverlayProps) {
  if (!open) return null
  return (
    <div className="overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}
