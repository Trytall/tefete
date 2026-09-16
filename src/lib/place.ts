import { familyIds } from './flex'
import type { ItemHolder } from './holders'
import type { Catalog, Item, ItemLoadout, MetaComp } from './types'

export type ItemPlace = {
  itemId: string
  craftable: boolean
  championIds: string[]
  source: 'build' | 'alt' | 'meta' | 'carry'
}

function unique(ids: string[]) {
  return [...new Set(ids.filter(Boolean))]
}

export function rosterOf(comp: MetaComp) {
  return unique([
    ...comp.unitIds,
    ...(comp.board ?? []).map((slot) => slot.id),
    ...(comp.loadouts ?? []).map((entry) => entry.championId),
    ...(comp.altLoadouts ?? []).map((entry) => entry.championId),
    ...comp.carryIds,
  ])
}

function sameLine(a: string, b: string, catalog: Catalog) {
  if (a === b) return true
  return familyIds(a, catalog).has(b) || familyIds(b, catalog).has(a)
}

function toRoster(id: string | undefined, roster: string[], catalog: Catalog) {
  if (!id) return undefined
  return roster.find((unit) => sameLine(unit, id, catalog))
}

function champsWithItem(loadouts: { championId: string; itemIds: string[] }[] | undefined, itemId: string) {
  return unique((loadouts ?? []).filter((entry) => entry.itemIds.includes(itemId)).map((entry) => entry.championId))
}

function sharesPart(item: Item, otherId: string, catalog: Catalog) {
  const other = catalog.items.find((entry) => entry.id === otherId)
  if (!item.composition.length || !other?.composition.length) return false
  return item.composition.some((part) => other.composition.includes(part))
}

export function placeOwnedOnComp(
  comp: MetaComp,
  ownedIds: string[],
  craftableIds: Iterable<string>,
  holders: Record<string, ItemHolder[]>,
  catalog: Catalog,
): ItemPlace[] {
  const owned = new Set(ownedIds)
  const crafted = new Set(craftableIds)
  const roster = rosterOf(comp)
  const items = unique([...ownedIds, ...crafted])
    .map((id) => catalog.items.find((entry) => entry.id === id))
    .filter((item): item is Item => Boolean(item) && item.kind !== 'component')

  return items
    .map((item): ItemPlace | null => {
      const inBuild = unique(champsWithItem(comp.loadouts, item.id).map((id) => toRoster(id, roster, catalog) ?? id))
      if (inBuild.length) return { itemId: item.id, craftable: !owned.has(item.id), championIds: inBuild, source: 'build' }

      const inAlt = unique(champsWithItem(comp.altLoadouts, item.id).map((id) => toRoster(id, roster, catalog) ?? id))
      if (inAlt.length) return { itemId: item.id, craftable: !owned.has(item.id), championIds: inAlt, source: 'alt' }

      const fromMeta = unique(
        (holders[item.id] ?? [])
          .map((holder) => toRoster(holder.unitId, roster, catalog))
          .filter((id): id is string => Boolean(id)),
      )
      if (fromMeta.length) {
        return { itemId: item.id, craftable: !owned.has(item.id), championIds: fromMeta.slice(0, 3), source: 'meta' }
      }

      const similar = unique(
        (comp.loadouts ?? [])
          .filter((entry) => entry.itemIds.some((id) => sharesPart(item, id, catalog)))
          .sort((a, b) => Number(comp.carryIds.includes(b.championId)) - Number(comp.carryIds.includes(a.championId)))
          .map((entry) => toRoster(entry.championId, roster, catalog) ?? entry.championId),
      )
      if (similar.length) {
        return { itemId: item.id, craftable: !owned.has(item.id), championIds: similar.slice(0, 2), source: 'carry' }
      }

      const carry = toRoster(comp.carryIds[0], roster, catalog) ?? roster[0]
      if (!carry) return null
      return { itemId: item.id, craftable: !owned.has(item.id), championIds: [carry], source: 'carry' }
    })
    .filter((row): row is ItemPlace => Boolean(row))
}

export function mergeSlamLoadouts(loadouts: ItemLoadout[], places: ItemPlace[]): ItemLoadout[] {
  const next: ItemLoadout[] = loadouts.map((entry) => ({ ...entry, itemIds: [...entry.itemIds] }))
  for (const place of places) {
    if (place.source === 'build' || place.source === 'alt') continue
    for (const championId of place.championIds.slice(0, 1)) {
      const row = next.find((entry) => entry.championId === championId)
      if (row) {
        if (!row.itemIds.includes(place.itemId)) row.itemIds.push(place.itemId)
      } else {
        next.push({ championId, itemIds: [place.itemId], kind: 'owned' })
      }
    }
  }
  return next
}
