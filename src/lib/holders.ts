export type ItemHolder = {
  unitId: string
  count: number
  avgPlace: number
  winRate: number
}

type HolderCache = {
  updatedAt: number
  items: Record<string, ItemHolder[]>
}

const CACHE_KEY = 'tefete-holders'
const CACHE_MS = 30 * 60 * 1000

function loadCache(): HolderCache {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return { updatedAt: 0, items: {} }
    const parsed = JSON.parse(raw) as HolderCache
    if (!parsed?.items) return { updatedAt: 0, items: {} }
    return parsed
  } catch {
    return { updatedAt: 0, items: {} }
  }
}

function saveCache(cache: HolderCache) {
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export async function fetchHolders(itemIds: string[]) {
  const unique = [...new Set(itemIds)].slice(0, 8)
  if (!unique.length) return {} as Record<string, ItemHolder[]>
  const cache = loadCache()
  const fresh = Date.now() - cache.updatedAt < CACHE_MS
  const missing = unique.filter((id) => !fresh || !cache.items[id])
  if (!missing.length) {
    return Object.fromEntries(unique.map((id) => [id, cache.items[id] ?? []]))
  }
  const response = await fetch(`/api/holders?items=${missing.map(encodeURIComponent).join(',')}`)
  if (!response.ok) throw new Error('holders')
  const body = (await response.json()) as { items?: Record<string, ItemHolder[]> }
  const next = {
    updatedAt: Date.now(),
    items: { ...cache.items, ...(body.items ?? {}) },
  }
  saveCache(next)
  return Object.fromEntries(unique.map((id) => [id, next.items[id] ?? []]))
}
