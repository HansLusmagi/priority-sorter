import type { ShareData } from "../types"

export function buildShareUrl(data: ShareData): string {
  const json = JSON.stringify(data)
  const encoded = btoa(unescape(encodeURIComponent(json)))
  return location.href.split("#")[0] + "#board=" + encodeURIComponent(encoded)
}

export function readShareHash(): ShareData | null {
  const hash = location.hash
  if (!hash || !hash.startsWith("#board=")) return null
  try {
    const raw = hash.replace("#board=", "")
    const decoded = decodeURIComponent(raw)
    const json = decodeURIComponent(escape(atob(decoded)))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function clearShareHash() {
  history.replaceState(null, "", location.pathname + location.search)
}
