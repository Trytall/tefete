import { assignItems, layoutComp } from './board'
import type { Catalog, CompMatch, Inventory, Item, MetaComp, MetaSnapshot, RankSort } from './types'

export function addCount(counts: Record<string, number>, id: string, delta = 1) {
  const next = { ...counts }
  const value = (next[id] ?? 0) + delta
  if (value <= 0) delete next[id]
  else next[id] = value
  return next
}

export function totalCount(counts: Record<string, number>) {
  return Object.values(counts).reduce((sum, n) => sum + n, 0)
}

function cloneCounts(counts: Record<string, number>) {
  return { ...counts }
}

function take(counts: Record<string, number>, id: string, amount = 1) {
  if ((counts[id] ?? 0) < amount) return false
  counts[id] -= amount
  if (counts[id] <= 0) delete counts[id]
  return true
}

export function craftableFrom(itemCounts: Record<string, number>, catalog: Catalog) {
  const crafted: Item[] = []
  for (const item of catalog.items) {
    if (item.kind === 'component' || item.composition.length !== 2) continue
    const pool = cloneCounts(itemCounts)
    const [left, right] = item.composition
    const ok = left === right ? take(pool, left, 2) : take(pool, left) && take(pool, right)
    if (ok) crafted.push(item)
  }
  return crafted
}

function metaScore(comp: MetaComp) {
  const tier = { S: 16, A: 12, B: 6, C: 0 }[comp.tier] ?? 0
  return (5.15 - comp.avgPlace) * 22 + Math.log1p(comp.pickRate) * 38 + comp.winRate * 0.9 + comp.top4 * 0.1 + tier
}

function sortValue(comp: MetaComp, sort: RankSort) {
  if (sort === 'pick') return comp.pickRate
  if (sort === 'avg') return -comp.avgPlace
  if (sort === 'win') return comp.winRate
  return metaScore(comp)
}

export function recommendComps(
  inventory: Inventory,
  catalog: Catalog,
  meta: MetaSnapshot,
  sort: RankSort = 'meta',
): CompMatch[] {
  const itemIds = new Set(Object.keys(inventory.items))
  const ownedCompleted = new Set(
    catalog.items.filter((item) => item.kind !== 'component' && itemIds.has(item.id)).map((item) => item.id),
  )
  const crafted = craftableFrom(inventory.items, catalog)
  const craftedIds = new Set(crafted.map((item) => item.id))
  const augmentIds = new Set(inventory.augments)
  const unitIds = new Set(inventory.units)
  const hasFilters = itemIds.size > 0 || augmentIds.size > 0 || unitIds.size > 0

  return meta.comps
    .map((comp) =>
      scoreComp(comp, catalog, { ownedCompleted, craftedIds, augmentIds, unitIds, hasFilters, sort }),
    )
    .sort((a, b) => b.score - a.score || b.comp.pickRate - a.comp.pickRate || a.comp.avgPlace - b.comp.avgPlace)
}

function scoreComp(
  comp: MetaComp,
  catalog: Catalog,
  ctx: {
    ownedCompleted: Set<string>
    craftedIds: Set<string>
    augmentIds: Set<string>
    unitIds: Set<string>
    hasFilters: boolean
    sort: RankSort
  },
): CompMatch {
  const itemHits = comp.itemIds.filter((id) => ctx.ownedCompleted.has(id))
  const craftHits = comp.itemIds.filter((id) => !ctx.ownedCompleted.has(id) && ctx.craftedIds.has(id))
  const augmentHits = comp.augmentIds.filter((id) => ctx.augmentIds.has(id))
  const unitHits = comp.unitIds.filter((id) => ctx.unitIds.has(id))

  let score = sortValue(comp, ctx.sort)
  score += itemHits.length * 22
  score += craftHits.length * 14
  score += augmentHits.length * 18
  score += unitHits.length * 9
  score += Math.min(comp.carryIds.filter((id) => ctx.unitIds.has(id)).length * 8, 16)

  if (ctx.hasFilters) {
    if (ctx.ownedCompleted.size + ctx.craftedIds.size > 0 && itemHits.length + craftHits.length === 0) {
      score *= 0.62
    }
    if (ctx.augmentIds.size > 0 && augmentHits.length === 0) score *= 0.82
    if (ctx.unitIds.size > 0 && unitHits.length === 0) score *= 0.88
  }

  const reasons: string[] = []
  if (itemHits.length) reasons.push(`Usa ${itemHits.length} objeto${itemHits.length === 1 ? '' : 's'} que ya tenés`)
  if (craftHits.length) reasons.push(`Podés armar ${craftHits.length} objeto${craftHits.length === 1 ? '' : 's'} de la comp`)
  if (augmentHits.length) reasons.push(`Coincide con ${augmentHits.length} aumento${augmentHits.length === 1 ? '' : 's'}`)
  if (unitHits.length) reasons.push(`Comparte ${unitHits.length} unidad${unitHits.length === 1 ? '' : 'es'}`)
  reasons.push(`Pick ${comp.pickRate.toFixed(2)}% · win ${comp.winRate.toFixed(1)}% · prom. ${comp.avgPlace.toFixed(2)}`)

  return {
    comp,
    score,
    itemHits,
    craftHits,
    augmentHits,
    unitHits,
    reasons,
    layout: layoutComp(comp, catalog),
    loadouts: assignItems(comp),
  }
}
