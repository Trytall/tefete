import { roleOf, starsFor } from './board'
import type { Catalog, Champion, FlexOption, HexSlot, ItemLoadout, MetaComp, UnitProfile } from './types'

export function lineName(name: string) {
  return name.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase()
}

export function familyOf(id: string, catalog: Catalog): Champion[] {
  const champ = catalog.champions.find((entry) => entry.id === id)
  if (!champ) return []
  const line = lineName(champ.name)
  return catalog.champions.filter((entry) => lineName(entry.name) === line)
}

export function familyIds(id: string, catalog: Catalog) {
  return new Set(familyOf(id, catalog).map((entry) => entry.id))
}

export function itemAlias(id: string, catalog: Catalog) {
  const family = familyOf(id, catalog)
  const base = family.find((entry) => /_Base$/i.test(entry.id)) ?? family.find((entry) => !entry.name.includes('('))
  return base?.id ?? id
}

export function traitsOf(id: string, catalog: Catalog) {
  return catalog.champions.find((entry) => entry.id === id)?.traits ?? []
}

export function flexHitsFor(ownedIds: string[], comp: MetaComp, catalog: Catalog) {
  const exact = new Set(comp.unitIds)
  const familyOnComp = new Set(comp.unitIds.flatMap((id) => [...familyIds(id, catalog)]))
  const compTraits = new Set(comp.unitIds.flatMap((id) => traitsOf(id, catalog)))
  return ownedIds.filter((id) => {
    if (exact.has(id) || familyOnComp.has(id)) return false
    return traitsOf(id, catalog).some((trait) => compTraits.has(trait))
  })
}

export function itemsForUnit(
  id: string,
  catalog: Catalog,
  comp: MetaComp,
  loadouts: ItemLoadout[],
  profile: UnitProfile | undefined,
  preferredItems: string[],
) {
  const completed = new Set(catalog.items.filter((item) => item.kind !== 'component').map((item) => item.id))
  const family = familyIds(id, catalog)
  const familyLoadout = loadouts.find((entry) => family.has(entry.championId))
  const wanted = unique(
    [
      ...(profile?.itemIds ?? []),
      ...(familyLoadout?.itemIds ?? []),
      ...(comp.itemPrio ?? []),
      ...comp.itemIds,
    ].filter((itemId) => completed.has(itemId)),
  )
  const preferred = preferredItems.filter((itemId) => completed.has(itemId) && (wanted.includes(itemId) || (profile?.itemIds ?? []).includes(itemId)))
  const picked = unique([...preferred, ...wanted.filter((itemId) => !preferred.includes(itemId))]).slice(0, 3)
  if (picked.length) return picked
  return preferredItems.filter((itemId) => completed.has(itemId)).slice(0, 3)
}

export function flexBench(comp: MetaComp, catalog: Catalog, onBoard: Set<string>, ownedIds: Set<string>): FlexOption[] {
  const champs = new Map(catalog.champions.map((champ) => [champ.id, champ]))
  const vertical = new Set(comp.traitIds)
  const missing = comp.unitIds
    .map((id) => champs.get(id))
    .filter((champ): champ is Champion => Boolean(champ))
    .filter((champ) => !ownedIds.has(champ.id) && ![...ownedIds].some((id) => familyIds(id, catalog).has(champ.id)))
  const ordered = [
    ...missing.filter((champ) => comp.carryIds.includes(champ.id)),
    ...missing.filter((champ) => !comp.carryIds.includes(champ.id)),
  ]
  const used = new Set([...onBoard, ...ownedIds])
  const rows: { id: string; replaces: string }[] = []

  for (const slot of ordered) {
    const role = roleOf(slot, comp.carryIds.includes(slot.id))
    const candidates = catalog.champions
      .filter((champ) => {
        if (used.has(champ.id)) return false
        if (familyIds(slot.id, catalog).has(champ.id)) return false
        const overlap = champ.traits.filter((trait) => slot.traits.includes(trait))
        if (!overlap.length) return false
        const other = roleOf(champ, false)
        if (role !== 'flex' && other !== 'flex' && other !== role) return false
        return Math.abs(champ.cost - slot.cost) <= 2
      })
      .sort((a, b) => {
        const overlapA = a.traits.filter((trait) => slot.traits.includes(trait) || vertical.has(trait)).length
        const overlapB = b.traits.filter((trait) => slot.traits.includes(trait) || vertical.has(trait)).length
        return overlapB - overlapA || Math.abs(a.cost - slot.cost) - Math.abs(b.cost - slot.cost) || a.cost - b.cost
      })
      .slice(0, 2)
    for (const champ of candidates) {
      used.add(champ.id)
      rows.push({ id: champ.id, replaces: slot.id })
    }
    if (rows.length >= 8) break
  }
  return rows.slice(0, 8)
}

export function fitOwnedOnBoard(
  layout: HexSlot[],
  loadouts: ItemLoadout[],
  ownedIds: string[],
  catalog: Catalog,
  comp: MetaComp,
  profiles: Record<string, UnitProfile> = {},
  preferredItems: string[] = [],
) {
  const champs = new Map(catalog.champions.map((champ) => [champ.id, champ]))
  const nextLayout = layout.map((slot) => ({ ...slot, source: slot.source ?? 'ideal' })) as HexSlot[]
  const nextLoadouts = loadouts.map((entry) => ({ ...entry, kind: entry.kind ?? 'ideal' })) as ItemLoadout[]

  for (const id of ownedIds) {
    const champ = champs.get(id)
    if (!champ) continue
    const family = familyIds(id, catalog)
    const profile = profiles[id]
    const exact = nextLayout.find((slot) => slot.id === id)
    const cousin = nextLayout.find((slot) => slot.id !== id && family.has(slot.id))
    const role = roleOf(champ, champ.cost >= 4 || comp.carryIds.includes(id) || [...family].some((member) => comp.carryIds.includes(member)))
    const isCarry = champ.cost >= 4 || comp.carryIds.includes(id)
    let slot = exact ?? cousin ?? null
    let replaced: string | undefined

    if (!slot && profile && !nextLayout.some((entry) => entry.row === profile.row && entry.col === profile.col)) {
      slot = {
        id,
        stars: starsFor(champ, comp, isCarry),
        row: profile.row,
        col: profile.col,
        role,
        source: 'owned',
      }
      nextLayout.push(slot)
    }

    if (!slot) {
      const empty = emptyHex(nextLayout, role, profile)
      if (empty && nextLayout.length < 9) {
        slot = {
          id,
          stars: starsFor(champ, comp, isCarry),
          row: empty.row,
          col: empty.col,
          role,
          source: 'owned',
        }
        nextLayout.push(slot)
      }
    }

    if (!slot) {
      const replaceable = nextLayout
        .filter((entry) => !ownedIds.includes(entry.id) && !comp.carryIds.includes(entry.id))
        .sort((a, b) => {
          const champA = champs.get(a.id)
          const champB = champs.get(b.id)
          const roleA = champA ? roleOf(champA, false) === role : false
          const roleB = champB ? roleOf(champB, false) === role : false
          return Number(roleB) - Number(roleA) || (champA?.cost ?? 9) - (champB?.cost ?? 9)
        })
      slot = replaceable[0] ?? null
      if (slot) replaced = slot.id
    }

    if (!slot) continue

    if (exact) {
      slot.source = 'owned'
    } else if (cousin) {
      replaced = cousin.id
      cousin.id = id
      cousin.stars = starsFor(champ, comp, isCarry)
      cousin.role = role
      cousin.source = 'owned'
      slot = cousin
    } else {
      slot.id = id
      slot.stars = starsFor(champ, comp, isCarry)
      slot.role = role
      slot.source = 'owned'
    }

    if (replaced) {
      const index = nextLoadouts.findIndex((entry) => entry.championId === replaced)
      if (index >= 0) nextLoadouts.splice(index, 1)
    }

    const itemIds = itemsForUnit(id, catalog, comp, loadouts, profile, preferredItems)
    const existing = nextLoadouts.findIndex((entry) => entry.championId === id)
    const loadout: ItemLoadout = {
      championId: id,
      itemIds,
      kind: 'owned',
      replaces: replaced,
    }
    if (existing >= 0) nextLoadouts[existing] = loadout
    else nextLoadouts.unshift(loadout)
  }

  return { layout: nextLayout, loadouts: nextLoadouts.filter((entry) => entry.itemIds.length > 0 || entry.kind === 'owned' || entry.kind === 'flex') }
}

function emptyHex(layout: HexSlot[], role: HexSlot['role'], profile?: UnitProfile) {
  if (profile && !layout.some((slot) => slot.row === profile.row && slot.col === profile.col)) {
    return { row: profile.row, col: profile.col }
  }
  const preferredRows = role === 'front' ? [0, 1] : role === 'back' ? [3, 2] : [2, 3, 1]
  for (const row of preferredRows) {
    for (const col of [3, 2, 4, 1, 5, 0, 6]) {
      if (!layout.some((slot) => slot.row === row && slot.col === col)) return { row, col }
    }
  }
  return null
}

function unique(ids: string[]) {
  return [...new Set(ids)]
}
