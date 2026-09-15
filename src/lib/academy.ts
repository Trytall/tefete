import type { Catalog, CompTier, HexSlot, ItemLoadout, MetaComp } from './types'

const STATS: Record<string, { avgPlace: number; pickRate: number; winRate: number; top4: number }> = {
  'Ahri Morgana': { avgPlace: 4.24, pickRate: 0.47, winRate: 11.3, top4: 56.1 },
  'Dragon 9': { avgPlace: 4.48, pickRate: 0.19, winRate: 17.2, top4: 48.0 },
  'Draven AD 9': { avgPlace: 4.29, pickRate: 1.49, winRate: 21.2, top4: 52.1 },
  'Ashe Fast 9': { avgPlace: 4.53, pickRate: 0.18, winRate: 18.6, top4: 47.8 },
  'Primal Jungle': { avgPlace: 4.22, pickRate: 0.27, winRate: 16.9, top4: 54.5 },
  'Aphelios Nidalee': { avgPlace: 4.16, pickRate: 0.46, winRate: 8.4, top4: 59.1 },
  'Malphite AP Flex': { avgPlace: 4.39, pickRate: 0.44, winRate: 10.1, top4: 52.9 },
  'Caitlyn Hunters': { avgPlace: 4.42, pickRate: 0.12, winRate: 6.9, top4: 52.8 },
  'Riftbeast Reroll': { avgPlace: 4.53, pickRate: 0.32, winRate: 10.1, top4: 49.5 },
  'Yi Rengar': { avgPlace: 4.53, pickRate: 0.17, winRate: 7.7, top4: 49.7 },
  '6 Juggernaut AP': { avgPlace: 4.57, pickRate: 0.11, winRate: 11.7, top4: 48.2 },
  'Invoker Morgana': { avgPlace: 4.49, pickRate: 0.06, winRate: 9.8, top4: 50.6 },
  'Solar Melee': { avgPlace: 4.62, pickRate: 0.19, winRate: 7.9, top4: 49.3 },
  'Defender Cassio': { avgPlace: 4.52, pickRate: 0.16, winRate: 7.6, top4: 50.8 },
  "Lunarwood Kha'Zix": { avgPlace: 4.39, pickRate: 0.09, winRate: 12.4, top4: 52.4 },
  Woodblossom: { avgPlace: 4.84, pickRate: 0.15, winRate: 11.4, top4: 43.0 },
  'Solara Yunara': { avgPlace: 4.63, pickRate: 0.05, winRate: 8.7, top4: 49.4 },
  'Elderwood Veigar': { avgPlace: 4.59, pickRate: 0.37, winRate: 10.0, top4: 48.5 },
  'Solar Kayle': { avgPlace: 4.73, pickRate: 0.04, winRate: 9.1, top4: 46.9 },
  'Invoker Nidalee': { avgPlace: 4.58, pickRate: 0.04, winRate: 10.1, top4: 48.9 },
  'Rengar Reroll': { avgPlace: 4.6, pickRate: 0.08, winRate: 8.5, top4: 48.0 },
  'Warwick Reroll': { avgPlace: 4.58, pickRate: 0.1, winRate: 9.0, top4: 48.5 },
  Teemowood: { avgPlace: 4.65, pickRate: 0.05, winRate: 8.8, top4: 47.0 },
}

const FALLBACK = { avgPlace: 4.55, pickRate: 0.08, winRate: 9, top4: 48 }

type AcademyGuide = {
  compSlug?: string
  title?: string
  name?: string
  tier?: string
  style?: string
  difficulty?: string
  mainChampion?: { apiName?: string }
  finalComp?: { apiName: string; items?: string[]; boardIndex?: number }[]
  altBuilds?: { apiName: string; items?: string[] }[]
  augments?: { apiName: string; disabled?: boolean }[]
  carousel?: ({ apiName?: string } | string)[]
}

function unique(ids: string[]) {
  return [...new Set(ids)]
}

function titleCase(value: string) {
  const text = String(value || 'medium').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function hexFromIndex(index: number | null | undefined): Pick<HexSlot, 'row' | 'col'> | null {
  if (!Number.isInteger(index) || Number(index) < 0 || Number(index) > 27) return null
  const value = Number(index)
  return { row: Math.floor(value / 7), col: value % 7 }
}

function escapeRegExp(value: string) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function localizeCompName(title: string, catalog: Catalog) {
  const replacements: [string, string][] = []
  for (const list of [catalog.traits, catalog.champions]) {
    for (const entry of list) {
      if (entry.nameEn && entry.name && entry.nameEn !== entry.name) {
        replacements.push([entry.nameEn, entry.name])
      }
    }
  }
  replacements.push(
    ['Primal Jungle', 'Jungla Primigenia'],
    ['Executioners', 'Ejecutores'],
    ['Hunters', 'Cazadores'],
    ['Invokers', 'Conjuradores'],
    ['Defenders', 'Defensores'],
    ['Adaptors', 'Adaptables'],
    ['Juggernaut', 'Coloso'],
    ['Riftbeasts', 'Grietozoicos'],
    ['Vanguards', 'Vanguardias'],
    ['Weavers', 'Forjahechizos'],
    ['Elderwood', 'Bosqueviejo'],
    ['Woodblossom', 'Floración Bosqueviejo'],
    ['Teemowood', 'Teemo Bosqueviejo'],
    ['Lunarwood', 'Lunar Bosqueviejo'],
    ['Solara', 'Solar'],
    ['Jungle', 'Jungla'],
    ['Reroll', 'Rerrol'],
    ['Melee', 'Cuerpo a cuerpo'],
    ['Dragon', 'Dragón'],
    ['Inferno', 'Infernal'],
  )
  replacements.sort((a, b) => b[0].length - a[0].length)
  let out = String(title || '')
  const used = new Set<string>()
  for (const [en, es] of replacements) {
    const key = en.toLowerCase()
    if (used.has(key) || !en) continue
    used.add(key)
    out = out.replace(new RegExp(`\\b${escapeRegExp(en)}\\b`, 'gi'), es)
  }
  return out
}

function traitsFor(unitIds: string[], catalog: Catalog) {
  const champsById = new Map(catalog.champions.map((champ) => [champ.id, champ]))
  const traitIds = new Set(catalog.traits.map((trait) => trait.id))
  const counts = new Map<string, number>()
  for (const id of unitIds) {
    for (const trait of champsById.get(id)?.traits ?? []) {
      counts.set(trait, (counts.get(trait) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([trait]) => trait)
    .filter((trait) => traitIds.has(trait))
}

export async function fetchAcademyGuides() {
  const response = await fetch('/api/academy')
  if (!response.ok) throw new Error(`Academy ${response.status}`)
  const payload = (await response.json()) as { guides?: AcademyGuide[] }
  return payload.guides ?? []
}

export function compsFromAcademyGuides(guides: AcademyGuide[], catalog: Catalog): MetaComp[] {
  const champIds = new Set(catalog.champions.map((entry) => entry.id))
  const itemIds = new Set(catalog.items.map((entry) => entry.id))
  const augIds = new Set(catalog.augments.map((entry) => entry.id))
  const comps = guides
    .filter((guide) => ['A', 'B', 'C'].includes(String(guide.tier)))
    .map((guide) => {
      const englishName = String(guide.title || guide.name || '').trim()
      const units = (guide.finalComp || []).filter((unit) => champIds.has(unit.apiName))
      const unitIds = units.map((unit) => unit.apiName)
      const loadouts: ItemLoadout[] = units
        .map((unit) => ({
          championId: unit.apiName,
          itemIds: unique((unit.items || []).filter((id) => itemIds.has(id))),
        }))
        .filter((entry) => entry.itemIds.length)
      const altLoadouts: ItemLoadout[] = (guide.altBuilds || [])
        .filter((unit) => champIds.has(unit.apiName))
        .map((unit) => ({
          championId: unit.apiName,
          itemIds: unique((unit.items || []).filter((id) => itemIds.has(id))),
        }))
        .filter((entry) => entry.itemIds.length)
      const itemPrio = unique(
        (guide.carousel || [])
          .map((entry) => (typeof entry === 'string' ? entry : entry.apiName || ''))
          .filter((id) => itemIds.has(id)),
      )
      const augmentIds = unique(
        (guide.augments || [])
          .filter((entry) => !entry.disabled)
          .map((entry) => catalog.augmentAliases?.[entry.apiName] ?? entry.apiName)
          .filter((id) => augIds.has(id)),
      )
      const board: HexSlot[] = []
      for (const unit of units) {
        const hex = hexFromIndex(unit.boardIndex)
        if (!hex) continue
        board.push({ id: unit.apiName, stars: 1, row: hex.row, col: hex.col })
      }
      const main = guide.mainChampion?.apiName
      const carryIds = unique(
        [main, ...loadouts.filter((entry) => entry.itemIds.length >= 2).map((entry) => entry.championId)].filter(
          (id): id is string => Boolean(id && unitIds.includes(id)),
        ),
      )
      const stats = STATS[englishName] ?? FALLBACK
      const tier = (['S', 'A', 'B', 'C'].includes(String(guide.tier)) ? guide.tier : 'B') as CompTier
      return {
        id: String(guide.compSlug || englishName).replace(/^set-18-/, ''),
        name: localizeCompName(englishName, catalog),
        tier,
        style: guide.style || 'Standard',
        difficulty: titleCase(guide.difficulty || 'Medium'),
        unitIds,
        carryIds: carryIds.length ? carryIds : unitIds.slice(0, 1),
        itemIds: unique([
          ...loadouts.flatMap((entry) => entry.itemIds),
          ...altLoadouts.flatMap((entry) => entry.itemIds),
          ...itemPrio.filter((id) => !id.includes('Component')),
        ]),
        augmentIds,
        traitIds: traitsFor(unitIds, catalog),
        loadouts,
        altLoadouts,
        itemPrio,
        board,
        ...stats,
      } satisfies MetaComp
    })
    .filter((comp) => comp.name && comp.unitIds.length)

  const usedIds = new Set<string>()
  for (const comp of comps) {
    let id = comp.id || 'comp'
    if (usedIds.has(id)) id = `${id}-${comp.tier.toLowerCase()}`
    if (usedIds.has(id)) id = `${id}-${usedIds.size}`
    usedIds.add(id)
    comp.id = id
  }
  return comps
}
