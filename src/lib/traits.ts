import type { Catalog, Champion, Trait } from './types'

export type TraitCount = {
  trait: Trait
  count: number
  next: number
  active: boolean
}

export function traitCounts(unitIds: string[], catalog: Catalog): TraitCount[] {
  const champs = new Map(catalog.champions.map((champ) => [champ.id, champ]))
  const totals = new Map<string, number>()
  for (const id of unitIds) {
    const champ = champs.get(id) as Champion | undefined
    for (const traitId of champ?.traits ?? []) {
      totals.set(traitId, (totals.get(traitId) ?? 0) + 1)
    }
  }
  const rows: TraitCount[] = []
  for (const [id, count] of totals) {
    const trait = catalog.traits.find((entry) => entry.id === id)
    if (!trait) continue
    const breaks = trait.breaks?.length ? trait.breaks : [2, 4, 6]
    const next = breaks.find((value) => count < value) ?? breaks[breaks.length - 1]
    rows.push({
      trait,
      count,
      next,
      active: count >= (breaks[0] ?? 1),
    })
  }
  return rows.sort((a, b) => b.count - a.count || a.trait.name.localeCompare(b.trait.name, 'es'))
}
