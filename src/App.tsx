import { BoardProvider } from "./hooks/useBoardStore"
import { AppShell } from "./AppShell"

export default function App() {
  return (
    <BoardProvider>
      <AppShell />
    </BoardProvider>
  )
}
