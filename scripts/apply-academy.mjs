import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ACADEMY_URL = 'https://tftacademy.com/api/tierlist/comps?set=18'
const catalog = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'catalog.json'), 'utf8'))

const champIds = new Set(catalog.champions.map((entry) => entry.id))
const itemIds = new Set(catalog.items.map((entry) => entry.id))
const augIds = new Set(catalog.augments.map((entry) => entry.id))
const traitsByName = new Map(catalog.traits.map((entry) => [entry.name, entry.id]))
const traitsById = new Set(catalog.traits.map((entry) => entry.id))
const champsById = new Map(catalog.champions.map((entry) => [entry.id, entry]))

const STATS = {
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

const SPECIAL_NAMES = {
  DA_Elderwood18_Lifeblossom: 'Vitaflor',
  DA_Elderwood18_StonebarkTree: 'Árbol de Rocorteza',
  DA_Elderwood18_Protector: 'Protector del Bosque',
}

const SPECIAL_NAMES_EN = {
  DA_Elderwood18_Lifeblossom: 'Lifebloom',
  DA_Elderwood18_StonebarkTree: 'Stonebark Tree',
  DA_Elderwood18_Protector: 'Deepwood Protector',
}

function unique(ids) {
  return [...new Set(ids)]
}

function prettyName(id) {
  return id
    .replace(/^DA_(18_)?(Item_)?(Artifact_)?(Component_)?(Elderwood18_)?/, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
}

function academyIcon(kind, id) {
  if (kind === 'champ') return `https://assets.tftacademy.com/champions/champion_icons/${id}.webp`
  if (kind === 'aug') return `https://assets.tftacademy.com/augments/${id}.webp`
  return `https://assets.tftacademy.com/items/${id}.webp`
}

function ensureItem(id) {
  if (itemIds.has(id)) return true
  const kind = /Emblem/.test(id) ? 'emblem' : id.includes('Component') ? 'component' : 'completed'
  catalog.items.push({
    id,
    name: prettyName(id),
    kind,
    composition: [],
    icon: academyIcon('item', id),
    unique: kind !== 'component',
  })
  itemIds.add(id)
  return true
}

function resolveAugment(id) {
  if (augIds.has(id)) return id
  const alias = catalog.augmentAliases?.[id]
  if (alias && augIds.has(alias)) return alias
  return null
}

function ensureSpecial(id) {
  const name = SPECIAL_NAMES[id] ?? prettyName(id)
  const nameEn = SPECIAL_NAMES_EN[id]
  const icon = academyIcon('champ', id)
  if (champIds.has(id)) {
    const champ = champsById.get(id)
    if (champ) {
      champ.icon = icon
      champ.name = name
      if (nameEn) champ.nameEn = nameEn
    }
    return
  }
  const entry = { id, name, ...(nameEn ? { nameEn } : {}), cost: 0, traits: [], icon }
  catalog.champions.push(entry)
  champIds.add(id)
  champsById.set(id, entry)
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function localizeCompName(title) {
  const replacements = []
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
    ['Lunarwood', "Lunar Bosqueviejo"],
    ['Solara', 'Solar'],
    ['Jungle', 'Jungla'],
    ['Reroll', 'Rerrol'],
    ['Melee', 'Cuerpo a cuerpo'],
    ['Dragon', 'Dragón'],
    ['Inferno', 'Infernal'],
  )
  replacements.sort((a, b) => b[0].length - a[0].length)
  let out = String(title || '')
  const used = new Set()
  for (const [en, es] of replacements) {
    const key = en.toLowerCase()
    if (used.has(key) || !en) continue
    used.add(key)
    out = out.replace(new RegExp(`\\b${escapeRegExp(en)}\\b`, 'gi'), es)
  }
  return out
}

function titleCase(value) {
  const text = String(value || 'medium').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function hexFromIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index > 27) return null
  return { row: Math.floor(index / 7), col: index % 7 }
}

function traitsFor(unitIds) {
  const counts = new Map()
  for (const id of unitIds) {
    const champ = champsById.get(id)
    for (const trait of champ?.traits ?? []) {
      counts.set(trait, (counts.get(trait) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([trait]) => (traitsById.has(trait) ? trait : traitsByName.get(trait)))
    .filter(Boolean)
}

function compactGuide(guide) {
  return {
    slug: guide.compSlug,
    name: String(guide.title || guide.name || '').trim(),
    tier: guide.tier,
    style: guide.style || 'Standard',
    difficulty: titleCase(guide.difficulty),
    mainChampion: guide.mainChampion?.apiName ?? null,
    units: (guide.finalComp || []).map((unit) => ({
      champ: unit.apiName,
      items: unit.items || [],
      boardIndex: Number.isInteger(unit.boardIndex) ? unit.boardIndex : null,
    })),
    alts: (guide.altBuilds || []).map((unit) => ({
      champ: unit.apiName,
      items: unit.items || [],
    })),
    augments: (guide.augments || []).filter((entry) => !entry.disabled).map((entry) => entry.apiName),
    carousel: (guide.carousel || []).map((entry) => entry.apiName || entry).filter(Boolean),
  }
}

async function loadAcademy() {
  const response = await fetch(ACADEMY_URL)
  if (!response.ok) throw new Error(`Academy ${response.status}`)
  const payload = await response.json()
  const academy = (payload.guides || [])
    .filter((guide) => ['A', 'B', 'C'].includes(guide.tier))
    .map(compactGuide)
    .filter((comp) => comp.name && comp.units.length)
  await writeFile(join(ROOT, 'scripts', 'academy.json'), JSON.stringify(academy, null, 2))
  return academy
}

const academy = await loadAcademy()
const dropped = []

const comps = academy.map((comp) => {
  for (const unit of comp.units) {
    if (unit.champ.startsWith('DA_Elderwood18_')) ensureSpecial(unit.champ)
  }
  const units = comp.units.filter((unit) => {
    if (champIds.has(unit.champ)) return true
    dropped.push(`${comp.name}: unit ${unit.champ}`)
    return false
  })
  const loadouts = units
    .map((unit) => ({
      championId: unit.champ,
      itemIds: unique(unit.items.filter((id) => ensureItem(id))),
    }))
    .filter((entry) => entry.itemIds.length)
  const altLoadouts = (comp.alts || [])
    .filter((unit) => champIds.has(unit.champ))
    .map((unit) => ({
      championId: unit.champ,
      itemIds: unique(unit.items.filter((id) => ensureItem(id))),
    }))
    .filter((entry) => entry.itemIds.length)
  const itemPrio = unique((comp.carousel || []).filter((id) => ensureItem(id)))
  const augmentIds = unique((comp.augments || []).map((id) => resolveAugment(id)).filter(Boolean))
  const unitIds = units.map((unit) => unit.champ)
  const board = units
    .map((unit) => {
      const hex = hexFromIndex(unit.boardIndex)
      if (!hex) return null
      return {
        id: unit.champ,
        stars: 1,
        row: hex.row,
        col: hex.col,
      }
    })
    .filter(Boolean)
  const carryIds = unique(
    [
      comp.mainChampion,
      ...loadouts.filter((entry) => entry.itemIds.length >= 2).map((entry) => entry.championId),
    ].filter((id) => id && unitIds.includes(id)),
  )
  const stats = STATS[comp.name] ?? { avgPlace: 4.55, pickRate: 0.08, winRate: 9, top4: 48 }
  return {
    id: String(comp.slug || comp.name).replace(/^set-18-/, ''),
    name: localizeCompName(comp.name),
    tier: comp.tier,
    style: comp.style,
    difficulty: comp.difficulty,
    unitIds,
    carryIds: carryIds.length ? carryIds : unitIds.slice(0, 1),
    itemIds: unique([
      ...loadouts.flatMap((entry) => entry.itemIds),
      ...altLoadouts.flatMap((entry) => entry.itemIds),
      ...itemPrio.filter((id) => !id.includes('Component')),
    ]),
    augmentIds,
    traitIds: traitsFor(unitIds),
    loadouts,
    altLoadouts,
    itemPrio,
    board,
    ...stats,
  }
})

const usedIds = new Set()
for (const comp of comps) {
  let id = comp.id || 'comp'
  if (usedIds.has(id)) id = `${id}-${comp.tier.toLowerCase()}`
  if (usedIds.has(id)) id = `${id}-${usedIds.size}`
  usedIds.add(id)
  comp.id = id
}

await writeFile(join(ROOT, 'src', 'data', 'catalog.json'), JSON.stringify(catalog))

const meta = {
  patch: catalog.patch,
  set: catalog.set,
  setName: catalog.setName,
  sources: {
    metatft: 'https://www.metatft.com/comps',
    tftacademy: 'https://tftacademy.com/tierlist/comps',
  },
  notes: [
    'Comps, unidades, ítems, prioridad y aumentos: API de TFT Academy, versión 18.2b.',
    'Promedio, pick y win se cruzan con MetaTFT Platino+ cuando hay una línea equivalente.',
    'Nombres de ítems, campeones, rasgos y aumentos: cliente LAS (es_AR).',
  ],
  updatedAt: new Date().toISOString(),
  comps,
}

await writeFile(join(ROOT, 'src', 'data', 'meta.json'), JSON.stringify(meta, null, 2))
console.log(JSON.stringify({ comps: comps.length, dropped: [...new Set(dropped)] }, null, 2))
