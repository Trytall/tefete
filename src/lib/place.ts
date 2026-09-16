import { roleOf } from './board'
import { familyIds } from './flex'
import type { ItemHolder } from './holders'
import type { Catalog, Champion, Item, ItemLoadout, MetaComp } from './types'

export type ItemPlace = {
  itemId: string
  craftable: boolean
  championIds: string[]
  source: 'build' | 'alt' | 'fit'
}

type ItemKind = 'ad' | 'ap' | 'tank' | 'bruiser' | 'gloves' | 'emblem' | 'utility'

const AD_PARTS = new Set(['DA_Component_BFSword', 'DA_Component_RecurveBow', 'DA_Component_SparringGloves'])
const AP_PARTS = new Set(['DA_Component_NeedlesslyLargeRod', 'DA_Component_TearOfTheGoddess'])
const TANK_PARTS = new Set(['DA_Component_ChainVest', 'DA_Component_NegatronCloak', 'DA_Component_GiantsBelt'])
const AP_TRAITS = /Invoker|Spellweaver|Battlemage|Conjurador|Forjahechizos|Adaptor|Adaptable/i
const AD_TRAITS = /Hunter|Rapidfire|Executioner|Slayer|Cazador|Fuegorrápido|Ejecutor|Arrasador|Cazarrecompensas/i
const FRONT_TRAITS = /Vanguard|Defender|Juggernaut|Brawler|Vanguardia|Defensor|Coloso|Peleador|Monolito/i

function unique(ids: string[]) {
  return [...new Set(ids.filter(Boolean))]
}

export function rosterOf(comp: MetaComp) {
  return unique([
    ...comp.carryIds,
    ...(comp.loadouts ?? []).map((entry) => entry.championId),
    ...(comp.board ?? []).map((slot) => slot.id),
    ...comp.unitIds,
    ...(comp.altLoadouts ?? []).map((entry) => entry.championId),
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

function kindOf(item: Item): ItemKind {
  const id = item.id.replace(/Radiant|_Radiant/gi, '')
  if (item.kind === 'emblem' || /Emblem|Spatula|FryingPan/i.test(id)) return 'emblem'
  if (/ThiefsGloves/i.test(id)) return 'gloves'
  if (/Warmog|Bramble|DragonsClaw|Gargoyle|Evenshroud|Steadfast|Sunfire|IonicSpark|Redemption|SpiritVisage/i.test(id)) {
    return 'tank'
  }
  if (/Sterak|TitansResolve|Bloodthirster|EdgeOfNight|Quicksilver|ProtectorsVow|Crownguard|AdaptiveHelm/i.test(id)) {
    return 'bruiser'
  }
  if (/InfinityEdge|Deathblade|GiantSlayer|LastWhisper|Kraken|Guinsoo|RapidFire|Runaan|Statikk|Gunblade/i.test(id)) {
    return 'ad'
  }
  if (/Jeweled|Deathcap|Rabadon|Shojin|Archangel|Nashor|Morello|VoidStaff|BlueBuff|Guardbreaker|StrikersFlail|Luden|LichBane/i.test(id)) {
    return 'ap'
  }
  const ad = item.composition.filter((part) => AD_PARTS.has(part)).length
  const ap = item.composition.filter((part) => AP_PARTS.has(part)).length
  const tank = item.composition.filter((part) => TANK_PARTS.has(part)).length
  if (tank >= 2) return 'tank'
  if (ap >= 2) return 'ap'
  if (ad >= 2 && tank === 0 && ap === 0) return 'ad'
  if (tank && (ad || ap)) return 'bruiser'
  if (ap) return 'ap'
  if (ad) return 'ad'
  if (tank) return 'tank'
  return 'utility'
}

function loadoutKinds(comp: MetaComp, championId: string, catalog: Catalog): ItemKind[] {
  const ids = [
    ...(comp.loadouts ?? []).filter((entry) => sameLine(entry.championId, championId, catalog)).flatMap((entry) => entry.itemIds),
    ...(comp.altLoadouts ?? []).filter((entry) => sameLine(entry.championId, championId, catalog)).flatMap((entry) => entry.itemIds),
  ]
  return ids
    .map((id) => catalog.items.find((item) => item.id === id))
    .filter((item): item is Item => Boolean(item))
    .map(kindOf)
}

function champScore(
  champ: Champion,
  kind: ItemKind,
  comp: MetaComp,
  catalog: Catalog,
  holderRank: number | null,
) {
  const isCarry = comp.carryIds.some((id) => sameLine(id, champ.id, catalog))
  const role = roleOf(champ, isCarry)
  const kinds = loadoutKinds(comp, champ.id, catalog)
  let score = Math.min(champ.cost, 5) * 3
  if (holderRank != null) score += 72 - holderRank * 14
  if (kind !== 'gloves' && isCarry) score += 26
  if (kinds.includes(kind)) score += 58
  if (kind === 'ad' && (role === 'back' || isCarry || champ.traits.some((trait) => AD_TRAITS.test(trait)))) score += 34
  if (kind === 'ap' && (role === 'back' || isCarry || champ.traits.some((trait) => AP_TRAITS.test(trait)))) score += 34
  if (kind === 'tank' && (role === 'front' || champ.traits.some((trait) => FRONT_TRAITS.test(trait)))) score += 50
  if (kind === 'bruiser' && role !== 'back') score += 28
  if (kind === 'gloves') {
    if (kinds.includes('gloves')) score += 40
    if (!isCarry) score += 38
    if (role !== 'back') score += 12
  }
  if (kind === 'emblem') score += isCarry ? 22 : 10
  if (kind === 'utility') score += isCarry ? 12 : 8
  return score
}

function pickChamps(
  item: Item,
  roster: string[],
  comp: MetaComp,
  catalog: Catalog,
  holders: ItemHolder[],
): string[] {
  const kind = kindOf(item)
  const ranked = roster
    .map((id) => catalog.champions.find((champ) => champ.id === id))
    .filter((champ): champ is Champion => Boolean(champ))
    .map((champ) => {
      const holderRank = holders.findIndex((holder) => toRoster(holder.unitId, roster, catalog) === champ.id)
      return {
        id: champ.id,
        score: champScore(champ, kind, comp, catalog, holderRank >= 0 ? holderRank : null),
      }
    })
    .sort((a, b) => b.score - a.score)
  if (!ranked.length) return []
  const best = ranked[0]
  const extra = ranked.filter((entry) => entry.id !== best.id && entry.score >= best.score - 10).slice(0, 1)
  return [best.id, ...extra.map((entry) => entry.id)]
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
      if (inBuild.length) {
        return { itemId: item.id, craftable: !owned.has(item.id), championIds: inBuild, source: 'build' }
      }
      const inAlt = unique(champsWithItem(comp.altLoadouts, item.id).map((id) => toRoster(id, roster, catalog) ?? id))
      if (inAlt.length) {
        return { itemId: item.id, craftable: !owned.has(item.id), championIds: inAlt, source: 'alt' }
      }
      const championIds = pickChamps(item, roster, comp, catalog, holders[item.id] ?? [])
      if (!championIds.length) return null
      return { itemId: item.id, craftable: !owned.has(item.id), championIds, source: 'fit' }
    })
    .filter((row): row is ItemPlace => Boolean(row))
}

export function mergeSlamLoadouts(loadouts: ItemLoadout[], places: ItemPlace[]): ItemLoadout[] {
  const next: ItemLoadout[] = loadouts.map((entry) => ({ ...entry, itemIds: [...entry.itemIds] }))
  for (const place of places) {
    if (place.source === 'build' || place.source === 'alt') continue
    const championId = place.championIds[0]
    if (!championId) continue
    const row = next.find((entry) => entry.championId === championId)
    if (row) {
      if (!row.itemIds.includes(place.itemId)) row.itemIds.push(place.itemId)
    } else {
      next.push({ championId, itemIds: [place.itemId], kind: 'owned' })
    }
  }
  return next
}
