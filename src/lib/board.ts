import type { Catalog, Champion, HexSlot, ItemLoadout, MetaComp, UnitRole } from './types'

const FRONT_TRAITS = new Set([
  'DA_18_Vanguard',
  'DA_18_Defender',
  'DA_Juggernaut18',
  'DA_18_Brawler',
  'DA_18_Battlemage',
  'Vanguardia',
  'Defensor',
  'Coloso',
  'Peleador',
  'Monolito',
])

const BACK_TRAITS = new Set([
  'DA_18_Hunter',
  'DA_18_Rapidfire',
  'DA_18_Spellweaver',
  'DA_18_Executioner',
  'DA_18_Invoker',
  'DA_18_Adaptor',
  'DA_18_Slayer',
  'DA_18_ZyraUniqueTrait',
  'DA_DravenUniqueTrait18',
  'Cazador',
  'Fuegorrápido',
  'Forjahechizos',
  'Ejecutor',
  'Conjurador',
  'Adaptable',
  'Arrasador',
  'Doncella de Espinas',
  'Cazarrecompensas',
])

export function roleOf(champ: Champion, isCarry: boolean): UnitRole {
  if (champ.traits.some((trait) => FRONT_TRAITS.has(trait))) return 'front'
  if (isCarry || champ.cost >= 4 || champ.traits.some((trait) => BACK_TRAITS.has(trait))) return 'back'
  return 'flex'
}

export function starsFor(champ: Champion, comp: MetaComp, isCarry: boolean): 1 | 2 | 3 {
  if (!champ.traits.length || champ.id.startsWith('DA_Elderwood18_')) return 1
  const rerollLevel =
    Number((comp.style.match(/lvl\s*(\d+)/i) ?? [])[1] ?? 0) ||
    (/1-cost reroll/i.test(comp.style) ? 5 : 0) ||
    (/2-cost reroll/i.test(comp.style) ? 6 : 0) ||
    (/3-cost reroll/i.test(comp.style) ? 7 : 0)
  const fast9 = /fast\s*9/i.test(comp.style)
  if (rerollLevel && isCarry && champ.cost <= (rerollLevel <= 6 ? 2 : 3)) return 3
  if (rerollLevel && champ.cost === 1) return 2
  if (fast9 && champ.cost === 5) return isCarry ? 2 : 1
  if (champ.cost === 5) return 1
  if (isCarry && champ.cost >= 4) return 2
  return 2
}

function pack(count: number) {
  const start = Math.max(0, Math.ceil((7 - count) / 2))
  return Array.from({ length: count }, (_, index) => Math.min(6, start + index))
}

export function layoutComp(comp: MetaComp, catalog: Catalog): HexSlot[] {
  const champs = new Map(catalog.champions.map((champ) => [champ.id, champ]))
  if (comp.board?.length) {
    return comp.board
      .map((slot) => {
        const champ = champs.get(slot.id)
        if (!champ) return null
        const isCarry = comp.carryIds.includes(slot.id)
        return {
          id: slot.id,
          stars: starsFor(champ, comp, isCarry),
          row: slot.row,
          col: slot.col,
          role: slot.role ?? roleOf(champ, isCarry),
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }

  const planned = comp.unitIds
    .map((id) => {
      const champ = champs.get(id)
      if (!champ) return null
      const isCarry = comp.carryIds.includes(id)
      return {
        id,
        stars: starsFor(champ, comp, isCarry),
        role: roleOf(champ, isCarry),
      }
    })
    .filter((entry): entry is { id: string; stars: 1 | 2 | 3; role: UnitRole } => Boolean(entry))

  const fronts = planned.filter((entry) => entry.role === 'front')
  const backs = planned.filter((entry) => entry.role === 'back')
  const flex = planned.filter((entry) => entry.role === 'flex')

  const overflowFront = fronts.length > 7 ? fronts.splice(7) : []
  const overflowBack = backs.length > 7 ? backs.splice(7) : []
  const mid = [...flex, ...overflowFront, ...overflowBack]

  const slots: HexSlot[] = []
  pack(fronts.length).forEach((col, index) => {
    slots.push({ ...fronts[index], row: 0, col })
  })
  pack(mid.length).forEach((col, index) => {
    slots.push({ ...mid[index], row: mid.length > 4 ? 1 : 2, col })
  })
  pack(backs.length).forEach((col, index) => {
    slots.push({ ...backs[index], row: 3, col })
  })
  return slots
}

/** Usa el loadout de TFT Academy si existe; si no, reparte 3 al carry. */
export function assignItems(comp: MetaComp): ItemLoadout[] {
  if (comp.loadouts?.length) {
    return comp.loadouts.filter((entry) => entry.itemIds.length > 0)
  }

  const carries = comp.carryIds.length ? comp.carryIds : comp.unitIds.slice(0, 1)
  if (!carries.length || !comp.itemIds.length) return []

  const queue = [...comp.itemIds]
  const primarySlots = Math.min(3, queue.length)
  const loadouts: ItemLoadout[] = [{ championId: carries[0], itemIds: queue.splice(0, primarySlots) }]

  for (let i = 1; i < carries.length && queue.length; i += 1) {
    const take = Math.min(3, Math.ceil(queue.length / (carries.length - i)))
    loadouts.push({ championId: carries[i], itemIds: queue.splice(0, take) })
  }

  if (queue.length) {
    const last = loadouts[loadouts.length - 1]
    last.itemIds.push(...queue.splice(0))
  }

  return loadouts.filter((entry) => entry.itemIds.length > 0)
}
