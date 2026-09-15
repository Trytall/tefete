import { difficultyEs, styleEs } from './es'
import type { Catalog, CompMatch, Inventory, RankSort } from './types'

const INV_KEY = 'tefete-inv'

export type SavedSession = {
  items: Record<string, number>
  augments: string[]
  units: string[]
  sort?: RankSort
  onlyMatches?: boolean
  pins?: string[]
  tiers?: Array<'S' | 'A' | 'B' | 'C'>
  traitFilter?: string | null
}

export function isPinnedApp() {
  return new URLSearchParams(window.location.search).get('app') === '1'
}

export function loadSavedSession(): SavedSession | null {
  try {
    const raw = window.localStorage.getItem(INV_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedSession
    if (!parsed || typeof parsed !== 'object') return null
    return {
      items: parsed.items && typeof parsed.items === 'object' ? parsed.items : {},
      augments: Array.isArray(parsed.augments) ? parsed.augments : [],
      units: Array.isArray(parsed.units) ? parsed.units : [],
      sort: parsed.sort,
      onlyMatches: parsed.onlyMatches,
      pins: Array.isArray(parsed.pins) ? parsed.pins : [],
      tiers: Array.isArray(parsed.tiers) ? parsed.tiers : undefined,
      traitFilter: parsed.traitFilter ?? null,
    }
  } catch {
    return null
  }
}

export function saveSession(session: SavedSession) {
  try {
    window.localStorage.setItem(INV_KEY, JSON.stringify(session))
  } catch {
    /* cuota llena o modo privado */
  }
}

function cleanItems(items: Record<string, number>, catalog: Catalog) {
  const known = new Set(catalog.items.map((item) => item.id))
  const next: Record<string, number> = {}
  for (const [id, count] of Object.entries(items)) {
    if (!known.has(id) || !Number.isFinite(count) || count <= 0) continue
    next[id] = Math.min(9, Math.floor(count))
  }
  return next
}

function cleanIds(ids: string[], known: Set<string>, aliases?: Record<string, string>) {
  return [
    ...new Set(
      ids
        .map((id) => (known.has(id) ? id : aliases?.[id]))
        .filter((id): id is string => Boolean(id && known.has(id))),
    ),
  ]
}

export function parseShare(search: string, catalog: Catalog) {
  const params = new URLSearchParams(search)
  const itemIds = new Set(catalog.items.map((item) => item.id))
  const augIds = new Set(catalog.augments.map((aug) => aug.id))
  const unitIds = new Set(catalog.champions.map((champ) => champ.id))
  const hasInv = params.has('i') || params.has('g') || params.has('n')
  const items: Record<string, number> = {}
  if (params.has('i')) {
    for (const token of params.get('i')!.split(',').filter(Boolean)) {
      const [id, rawCount] = token.split('*')
      if (!itemIds.has(id)) continue
      const count = Number(rawCount || 1)
      if (!Number.isFinite(count) || count <= 0) continue
      items[id] = Math.min(9, Math.floor(count))
    }
  }
  return {
    compId: params.get('c') || params.get('comp') || null,
    inventory: hasInv
      ? {
          items: cleanItems(items, catalog),
          augments: cleanIds((params.get('g') || '').split(',').filter(Boolean), augIds, catalog.augmentAliases),
          units: cleanIds((params.get('n') || '').split(',').filter(Boolean), unitIds),
        }
      : null,
  }
}

export function buildShareUrl(opts: { mode: 'play' | 'desk'; compId?: string | null; inventory: Inventory }) {
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set('mode', opts.mode)
  if (opts.compId) url.searchParams.set('c', opts.compId)
  const itemParts = Object.entries(opts.inventory.items)
    .filter(([, count]) => count > 0)
    .map(([id, count]) => (count > 1 ? `${id}*${count}` : id))
  if (itemParts.length) url.searchParams.set('i', itemParts.join(','))
  if (opts.inventory.augments.length) url.searchParams.set('g', opts.inventory.augments.join(','))
  if (opts.inventory.units.length) url.searchParams.set('n', opts.inventory.units.join(','))
  return url.toString()
}

export function formatCompText(entry: CompMatch, catalog: Catalog) {
  const champs = new Map(catalog.champions.map((champ) => [champ.id, champ]))
  const items = new Map(catalog.items.map((item) => [item.id, item]))
  const traits = new Map(catalog.traits.map((trait) => [trait.id, trait]))
  const traitNames = entry.comp.traitIds.map((id) => traits.get(id)?.name).filter(Boolean)
  const lines = [
    `tefete · ${entry.comp.name} (${entry.comp.tier})`,
    `${styleEs(entry.comp.style)} · ${difficultyEs(entry.comp.difficulty)} · pick ${entry.comp.pickRate.toFixed(2)}% · win ${entry.comp.winRate.toFixed(1)}%`,
  ]
  if (traitNames.length) lines.push(`Rasgos: ${traitNames.join(', ')}`)
  lines.push('')
  for (const slot of entry.layout) {
    const unit = champs.get(slot.id)
    if (!unit) continue
    const equipped = (entry.loadouts.find((loadout) => loadout.championId === slot.id)?.itemIds ?? [])
      .map((id) => items.get(id)?.name)
      .filter(Boolean)
    const gear = equipped.length ? ` — ${equipped.join(', ')}` : ''
    lines.push(`${unit.name} ${slot.stars}★${gear}`)
  }
  return lines.join('\n')
}
