let counter = 0
export function uid() {
  return "c" + Date.now() + "-" + counter++
}
export function genTaskId() {
  return "t" + Date.now() + "-" + counter++
}
export function genBoardId() {
  return "b_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6)
}
