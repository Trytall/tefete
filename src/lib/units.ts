import { itemAlias } from './flex'
import type { Catalog, UnitProfile } from './types'

type UnitCache = {
  updatedAt: number
  units: Record<string, UnitProfile>
}

const CACHE_KEY = 'tefete-unit-profiles'
const CACHE_MS = 30 * 60 * 1000

function loadCache(): UnitCache {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return { updatedAt: 0, units: {} }
    const parsed = JSON.parse(raw) as UnitCache
    if (!parsed?.units) return { updatedAt: 0, units: {} }
    return parsed
  } catch {
    return { updatedAt: 0, units: {} }
  }
}

function saveCache(cache: UnitCache) {
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export async function fetchUnitProfiles(unitIds: string[], catalog: Catalog) {
  const wanted = [...new Set(unitIds)].slice(0, 8)
  if (!wanted.length) return {} as Record<string, UnitProfile>
  const aliases = wanted.map((id) => itemAlias(id, catalog)).filter((id) => !wanted.includes(id))
  const lookup = [...new Set([...wanted, ...aliases])]
  const cache = loadCache()
  const fresh = Date.now() - cache.updatedAt < CACHE_MS
  const missing = lookup.filter((id) => !fresh || !cache.units[id])
  let pool = cache.units
  if (missing.length) {
    const response = await fetch(`/api/units?ids=${missing.map(encodeURIComponent).join(',')}`)
    if (!response.ok) throw new Error('units')
    const body = (await response.json()) as { units?: Record<string, UnitProfile> }
    pool = { ...cache.units, ...(body.units ?? {}) }
    saveCache({ updatedAt: Date.now(), units: pool })
  }
  const result: Record<string, UnitProfile> = {}
  for (const id of wanted) {
    const alias = itemAlias(id, catalog)
    const own = pool[id]
    const fallback = pool[alias]
    result[id] = {
      itemIds: own?.itemIds?.length ? own.itemIds : (fallback?.itemIds ?? []),
      row: own?.row ?? fallback?.row ?? 3,
      col: own?.col ?? fallback?.col ?? 3,
    }
  }
  return result
}
