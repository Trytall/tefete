import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'src', 'data')
const CDRAGON_BASE = 'https://raw.communitydragon.org/latest/cdragon/tft'
const LOCALE = 'es_ar'
const PATCH = '18.2b'
const SET = 18
const SET_NAME = 'Tierras Encantadas'

const META_COMPS = [
  { name: 'Lunar Aphelios Nidalee', tier: 'S', style: 'Fast 8', difficulty: 'Medium', units: ['Aphelios', 'Nidalee', 'Sentinel', 'Amumu', 'Diana', "Kog'Maw", 'Vi', 'Varus'], avgPlace: 4.16, pickRate: 0.46, winRate: 8.4, top4: 59.1, carry: ['Aphelios', 'Nidalee'], traits: ['Lunar', 'Primal', 'Hunter'], items: ['Infinity Edge', 'Last Whisper', "Giant Slayer", "Guinsoo's Rageblade"], augments: ['Sun and Moon', 'Sun and Moon+', 'Beast Within'] },
  { name: 'Hunter Sivir', tier: 'S', style: 'Fast 9', difficulty: 'Hard', units: ['Sivir', 'Ashe', 'Amumu', 'Lillia', 'Ivern', 'Kennen', 'Tristana', 'Vi', 'Shen'], avgPlace: 4.22, pickRate: 0.27, winRate: 16.9, top4: 54.5, carry: ['Sivir', 'Ashe'], traits: ['Hunter', 'Primal'], items: ['Infinity Edge', 'Last Whisper', 'Bloodthirster', "Giant Slayer"], augments: ['Beast Within', 'Big Grab Bag'] },
  { name: 'Invoker Ahri', tier: 'S', style: 'Fast 8', difficulty: 'Medium', units: ['Ahri', 'Morgana', 'Sett', 'Sentinel', 'Taric', 'Krug', 'Pebbles', 'Karma'], avgPlace: 4.24, pickRate: 0.47, winRate: 11.3, top4: 56.1, carry: ['Ahri', 'Morgana'], traits: ['Invoker', 'Blossom', 'Spellweaver'], items: ['Spear of Shojin', "Nashor's Tooth", "Jeweled Gauntlet", "Archangel's Staff"], augments: ['Caretaker\'s Ally', 'Big Grab Bag'] },
  { name: 'Blackthorn Malphite', tier: 'A', style: 'Standard', difficulty: 'Medium', units: ['Malphite', 'Veigar', 'Teemo', 'Gnar', 'Azir', 'Rammus', 'Fiddlesticks', 'Kobuko', "Rek'Sai"], avgPlace: 4.26, pickRate: 0.05, winRate: 12.1, top4: 54.6, carry: ['Malphite', 'Veigar'], traits: ['Blackthorn', 'Sprykin', 'Monolith'], items: ["Rabadon's Deathcap", 'Spear of Shojin', "Jeweled Gauntlet", 'Gargoyle Stoneplate'], augments: ['Embiggen', 'One, Two, Five!'] },
  { name: 'Hunter Malphite', tier: 'A', style: 'Fast 8', difficulty: 'Medium', units: ['Malphite', 'Nidalee', 'Sivir', 'Sentinel', "Kog'Maw", 'Krug', "Rek'Sai", 'Cinderling'], avgPlace: 4.27, pickRate: 0.26, winRate: 9.7, top4: 56.4, carry: ['Malphite', 'Nidalee', 'Sivir'], traits: ['Hunter', 'Primal', 'Blackthorn'], items: ['Infinity Edge', "Guinsoo's Rageblade", 'Warmogs Armor', 'Gargoyle Stoneplate'], augments: ['Beast Within', 'Beast Within+'] },
  { name: 'Inferno Draven', tier: 'A', style: 'Fast 9', difficulty: 'Hard', units: ['Draven', 'Maokai', 'Kennen', 'Gnar', 'Ivern', 'Taric', 'Ezreal', 'Amumu', 'Alistar'], avgPlace: 4.29, pickRate: 1.49, winRate: 21.2, top4: 52.1, carry: ['Draven'], traits: ['Inferno', 'Bounty Seeker'], items: ['Infinity Edge', 'Last Whisper', 'Bloodthirster', 'Quicksilver'], augments: ['Chosen of the Sun', 'Big Grab Bag'] },
  { name: 'Executioner Sett', tier: 'A', style: 'Fast 8', difficulty: 'Easy', units: ['Sett', 'Ezreal', 'Ahri', 'Soraka', 'Fiddlesticks', 'Alistar', 'Yunara', 'Ornn'], avgPlace: 4.31, pickRate: 0.07, winRate: 9.6, top4: 55.1, carry: ['Sett', 'Ezreal'], traits: ['Executioner', 'Blossom'], items: ['Bloodthirster', "Titan's Resolve", 'Infinity Edge', 'Sterak\'s Gage'], augments: ['Consuming Flora', 'Branching Out+'] },
  { name: 'Blossom Sett', tier: 'A', style: 'Fast 9', difficulty: 'Easy', units: ['Sett', 'Ahri', 'Ashe', 'Sivir', 'Gnar', 'Zyra', 'Vi', 'Yorick', 'Karma'], avgPlace: 4.33, pickRate: 0.2, winRate: 13.7, top4: 52.6, carry: ['Sett', 'Ahri', 'Ashe'], traits: ['Blossom'], items: ['Bloodthirster', 'Spear of Shojin', 'Infinity Edge', "Nashor's Tooth"], augments: ['Nature\'s Shelter', 'Big Grab Bag'] },
  { name: "Executioner Kha'Zix", tier: 'A', style: 'lvl 7', difficulty: 'Medium', units: ["Kha'Zix", 'Hecarim', 'Diana', 'Aphelios', 'Azir', "Kog'Maw", 'Warwick'], avgPlace: 4.39, pickRate: 0.09, winRate: 12.4, top4: 52.4, carry: ["Kha'Zix"], traits: ['Rival', 'Executioner'], items: ['Infinity Edge', 'Bloodthirster', 'Edge of Night', 'Quicksilver'], augments: ['Unrivaled'] },
  { name: 'Executioner Malphite', tier: 'A', style: 'Fast 8', difficulty: 'Medium', units: ['Malphite', 'Soraka', 'Zyra', 'Amumu', 'Kennen', 'Azir', 'Fiddlesticks', 'Yorick'], avgPlace: 4.39, pickRate: 0.44, winRate: 10.1, top4: 52.9, carry: ['Malphite', 'Soraka'], traits: ['Executioner', 'Blackthorn', 'Flora Fatalis'], items: ["Jeweled Gauntlet", 'Spear of Shojin', 'Morellonomicon', 'Gargoyle Stoneplate'], augments: ['Consuming Flora'] },
  { name: 'Juggernaut Caitlyn', tier: 'A', style: 'lvl 6', difficulty: 'Easy', units: ['Caitlyn', 'Scuttlecrab', 'Sivir', 'Sejuani', 'Ashe', 'Tristana', 'Vi', 'Rakan'], avgPlace: 4.42, pickRate: 0.12, winRate: 6.9, top4: 52.8, carry: ['Caitlyn'], traits: ['Hunter', 'Juggernaut', 'Coven'], items: ['Infinity Edge', 'Last Whisper', "Giant Slayer", "Guinsoo's Rageblade"], augments: ['Coven Acolyte'] },
  { name: 'Vanguard Elder Dragon', tier: 'A', style: 'Fast 9', difficulty: 'Hard', units: ['Elder Dragon', 'Maokai', 'Sentinel', 'Morgana', 'Ivern', 'Kennen', 'Taric', 'Amumu'], avgPlace: 4.48, pickRate: 0.19, winRate: 17.2, top4: 48.0, carry: ['Elder Dragon'], traits: ['Riftbeast', 'Vanguard', 'Apex Predator'], items: ['Bloodthirster', "Titan's Resolve", "Dragon's Claw", 'Gargoyle Stoneplate'], augments: ['Omega Riftbeast'] },
  { name: 'Invoker Sentinel', tier: 'A', style: 'Fast 8', difficulty: 'Easy', units: ['Morgana', 'Sentinel', 'Brambleback', 'Alune', 'Taric', 'Diana', 'Hecarim', "Kog'Maw", 'Pebbles'], avgPlace: 4.49, pickRate: 0.06, winRate: 9.8, top4: 50.6, carry: ['Morgana', 'Sentinel'], traits: ['Invoker', 'Riftbeast'], items: ['Spear of Shojin', "Archangel's Staff", 'Blue Buff', 'Gargoyle Stoneplate'], augments: ['Omega Riftbeast', "Caretaker's Ally"] },
  { name: 'Vanguard Morgana', tier: 'B', style: 'Fast 8', difficulty: 'Medium', units: ['Morgana', 'Sentinel', 'Ahri', 'Alune', 'Taric', 'Cassiopeia', 'Diana', 'Fiddlesticks', 'Elise'], avgPlace: 4.51, pickRate: 0.07, winRate: 14.2, top4: 48.8, carry: ['Morgana', 'Ahri'], traits: ['Vanguard', 'Invoker', 'Coven'], items: ['Spear of Shojin', "Nashor's Tooth", "Jeweled Gauntlet", "Protector's Vow"], augments: ['Coven Acolyte'] },
  { name: 'Defender Cassiopeia', tier: 'B', style: 'lvl 7', difficulty: 'Easy', units: ['Cassiopeia', 'Fiddlesticks', 'Rammus', 'Lillia', 'Shen', 'Leona', 'Ornn'], avgPlace: 4.52, pickRate: 0.16, winRate: 7.6, top4: 50.8, carry: ['Cassiopeia'], traits: ['Defender', 'Coven', 'Spellweaver'], items: ["Archangel's Staff", "Jeweled Gauntlet", 'Morellonomicon', 'Spear of Shojin'], augments: ['Coven Acolyte', 'Embiggen'] },
  { name: 'Juggernaut Ashe', tier: 'B', style: 'Fast 9', difficulty: 'Hard', units: ['Ashe', 'Maokai', 'Sivir', 'Elder Dragon', 'Ivern', 'Taric', 'Sentinel', 'Vi'], avgPlace: 4.53, pickRate: 0.18, winRate: 18.6, top4: 47.8, carry: ['Ashe'], traits: ['Hunter', 'Juggernaut', 'Blossom'], items: ['Infinity Edge', 'Last Whisper', "Giant Slayer", 'Bloodthirster'], augments: ['Nature\'s Shelter'] },
  { name: 'Adaptor Master Yi', tier: 'B', style: 'lvl 7', difficulty: 'Medium', units: ['Master Yi', 'Vi', 'Nidalee', 'Sett', "Kog'Maw", 'Krug', 'Yorick'], avgPlace: 4.53, pickRate: 0.17, winRate: 7.7, top4: 49.7, carry: ['Master Yi', 'Nidalee'], traits: ['Adaptor', 'Primal', 'Blossom'], items: ['Infinity Edge', 'Bloodthirster', "Titan's Resolve", 'Last Whisper'], augments: ['Beast Within'] },
  { name: 'Riftbeast Pebbles', tier: 'B', style: 'lvl 5', difficulty: 'Easy', units: ['Pebbles', 'Elder Dragon', 'Krug', 'Sentinel', 'Gnar', 'Taric', 'Brambleback', 'Murkwolf'], avgPlace: 4.53, pickRate: 0.32, winRate: 10.1, top4: 49.5, carry: ['Pebbles', 'Elder Dragon'], traits: ['Riftbeast'], items: ['Spear of Shojin', 'Blue Buff', "Archangel's Staff", 'Gargoyle Stoneplate'], augments: ['Omega Riftbeast'] },
  { name: 'Juggernaut Zyra', tier: 'B', style: 'Fast 8', difficulty: 'Medium', units: ['Zyra', 'Amumu', 'Maokai', 'Vi', 'Alune', 'Ivern', 'Sejuani', 'Scuttlecrab', 'Yorick'], avgPlace: 4.57, pickRate: 0.11, winRate: 11.7, top4: 48.2, carry: ['Zyra'], traits: ['Thornmaiden', 'Juggernaut', 'Summoner'], items: ["Jeweled Gauntlet", 'Spear of Shojin', 'Morellonomicon', "Archangel's Staff"], augments: ['Consuming Flora'] },
  { name: 'Primal Nidalee', tier: 'B', style: 'Fast 8', difficulty: 'Medium', units: ['Nidalee', 'Sivir', 'Amumu', 'Lillia', 'Sentinel', "Kog'Maw", 'Shen', 'Rakan'], avgPlace: 4.58, pickRate: 0.04, winRate: 10.1, top4: 48.9, carry: ['Nidalee', 'Sivir'], traits: ['Primal', 'Hunter', 'Adaptor'], items: ["Guinsoo's Rageblade", 'Infinity Edge', 'Bloodthirster', 'Spear of Shojin'], augments: ['Beast Within', 'Beast Within+'] },
  { name: 'Blossom Sett Ashe', tier: 'B', style: 'Fast 9', difficulty: 'Hard', units: ['Sett', 'Ashe', 'Ahri', 'Alune', 'Gnar', 'Lillia', 'Diana', 'Rammus', 'Tristana'], avgPlace: 4.58, pickRate: 0.08, winRate: 11.4, top4: 48.8, carry: ['Sett', 'Ashe', 'Ahri'], traits: ['Blossom'], items: ['Infinity Edge', 'Spear of Shojin', 'Bloodthirster', "Nashor's Tooth"], augments: ["Nature's Shelter"] },
  { name: 'Blackthorn Veigar', tier: 'B', style: 'lvl 5', difficulty: 'Hard', units: ['Veigar', 'Malphite', "Rek'Sai", 'Azir', 'Soraka', 'Rammus', 'Fiddlesticks', 'Kobuko'], avgPlace: 4.59, pickRate: 0.03, winRate: 12.2, top4: 48.5, carry: ['Veigar'], traits: ['Blackthorn', 'Sprykin', 'Spellweaver'], items: ["Rabadon's Deathcap", "Jeweled Gauntlet", 'Spear of Shojin', 'Blue Buff'], augments: ['Embiggen'] },
  { name: 'Spellweaver Veigar', tier: 'B', style: 'lvl 5', difficulty: 'Medium', units: ['Veigar', "Rek'Sai", 'Teemo', 'Gnar', 'Sett', 'Rammus', 'Fiddlesticks', 'Kobuko'], avgPlace: 4.59, pickRate: 0.37, winRate: 10.0, top4: 48.5, carry: ['Veigar'], traits: ['Spellweaver', 'Sprykin'], items: ["Rabadon's Deathcap", "Jeweled Gauntlet", "Archangel's Staff", 'Blue Buff'], augments: ['Embiggen', 'One, Two, Five!'] },
  { name: 'Vanguard Aphelios', tier: 'B', style: 'Fast 8', difficulty: 'Easy', units: ['Aphelios', 'Sentinel', 'Brambleback', 'Diana', 'Taric', 'Zyra', 'Hecarim', 'Mama Beak'], avgPlace: 4.61, pickRate: 0.12, winRate: 6.9, top4: 48.4, carry: ['Aphelios'], traits: ['Lunar', 'Vanguard', 'Rapidfire'], items: ['Infinity Edge', 'Last Whisper', "Giant Slayer", "Guinsoo's Rageblade"], augments: ['Sun and Moon'] },
  { name: 'Inferno Akali', tier: 'B', style: 'lvl 5', difficulty: 'Hard', units: ['Akali', 'Camille', 'Ornn', 'Varus', 'Kayle', 'Sejuani', 'Leona'], avgPlace: 4.62, pickRate: 0.19, winRate: 7.9, top4: 49.3, carry: ['Akali'], traits: ['Inferno', 'Adaptor', 'Ravager'], items: ['Infinity Edge', 'Bloodthirster', 'Edge of Night', "Titan's Resolve"], augments: ['Chosen of the Sun'] },
  { name: 'Executioner Yunara', tier: 'B', style: 'lvl 6', difficulty: 'Medium', units: ['Yunara', 'Alistar', 'LeBlanc', 'Ezreal', 'Ahri', 'Sett', 'Soraka', 'Azir'], avgPlace: 4.63, pickRate: 0.05, winRate: 8.7, top4: 49.4, carry: ['Yunara'], traits: ['Executioner', 'Blossom'], items: ['Infinity Edge', 'Last Whisper', 'Bloodthirster', "Giant Slayer"], augments: ["Nature's Shelter"] },
  { name: 'Spellweaver Ahri', tier: 'B', style: 'Standard', difficulty: 'Medium', units: ['Ahri', 'Fiddlesticks', 'Veigar', 'Cassiopeia', 'Alistar', 'LeBlanc', 'Ornn', "Rek'Sai"], avgPlace: 4.64, pickRate: 0.03, winRate: 9.2, top4: 47.7, carry: ['Ahri'], traits: ['Spellweaver', 'Blossom'], items: ['Spear of Shojin', "Nashor's Tooth", "Jeweled Gauntlet", "Archangel's Staff"], augments: ["Caretaker's Ally"] },
  { name: 'Elderwood Aphelios Lillia', tier: 'B', style: 'Fast 8', difficulty: 'Easy', units: ['Aphelios', 'Lillia', 'Alune', 'Gnar', 'Diana', 'Hecarim', 'Alistar', 'Ornn', 'Xayah'], avgPlace: 4.67, pickRate: 0.07, winRate: 10.7, top4: 47.3, carry: ['Aphelios', 'Lillia'], traits: ['Elderwood', 'Lunar'], items: ['Infinity Edge', 'Last Whisper', 'Gargoyle Stoneplate', "Protector's Vow"], augments: ["Nature's Shelter", 'Sun and Moon'] },
  { name: 'Lunar Kayle', tier: 'B', style: 'lvl 6', difficulty: 'Easy', units: ['Kayle', 'Sejuani', 'Aphelios', 'Leona', 'Alune', 'Diana', 'Shen', 'Varus'], avgPlace: 4.73, pickRate: 0.04, winRate: 9.1, top4: 46.9, carry: ['Kayle', 'Aphelios'], traits: ['Lunar', 'Solar', 'Rapidfire'], items: ["Guinsoo's Rageblade", 'Infinity Edge', "Giant Slayer", 'Last Whisper'], augments: ['Sun and Moon', 'Chosen of the Sun'] },
  { name: "Flora Fatalis Kha'Zix", tier: 'C', style: 'lvl 7', difficulty: 'Easy', units: ["Kha'Zix", 'Fiddlesticks', 'Aphelios', 'Diana', 'LeBlanc', 'Ornn', 'Rakan', 'Xayah'], avgPlace: 4.8, pickRate: 0.02, winRate: 8.8, top4: 45.5, carry: ["Kha'Zix"], traits: ['Flora Fatalis', 'Rival'], items: ['Infinity Edge', 'Bloodthirster', 'Edge of Night', 'Quicksilver'], augments: ['Consuming Flora', 'Unrivaled'] },
  { name: 'Elderwood Ezreal', tier: 'C', style: 'Standard', difficulty: 'Easy', units: ['Ezreal', 'Hecarim', 'Ornn', 'Soraka', 'Gnar', 'Fiddlesticks', 'Alistar', 'LeBlanc', 'Xayah'], avgPlace: 4.84, pickRate: 0.15, winRate: 11.4, top4: 43.0, carry: ['Ezreal'], traits: ['Elderwood', 'Executioner'], items: ['Infinity Edge', 'Last Whisper', "Giant Slayer", 'Spear of Shojin'], augments: ["Nature's Shelter", 'Branching Out+'] },
]

function iconUrl(path) {
  if (!path) return ''
  const p = String(path)
    .replaceAll('\\', '/')
    .replace(/\.tex$/i, '.png')
    .replace(/\.dds$/i, '.png')
    .replace(/^\/+/, '')
    .toLowerCase()
  return `https://raw.communitydragon.org/latest/game/${p}`
}

function stripDesc(desc) {
  if (!desc) return ''
  return desc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/@[^@]+@/g, '')
    .replace(/%i:[^%]+%/g, '')
    .replace(/\s+\n/g, '\n')
    .trim()
}

function norm(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]+/g, '')
}

function uniqueById(list) {
  const seen = new Set()
  return list.filter((entry) => {
    if (seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  })
}

function augmentPriority(id) {
  const value = String(id)
  if (value.startsWith('DA_18_')) return 0
  if (value.startsWith('DA_')) return 1
  if (value.startsWith('TFT_Augment_')) return 2
  const setNum = Number((/^TFT(\d+)/.exec(value) || [])[1] || 0)
  return 100 - setNum
}

function uniqueSetAugments(list) {
  const groups = new Map()
  for (const entry of list) {
    const key = norm(entry.nameEn || entry.name)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entry)
  }
  const kept = []
  const aliases = {}
  for (const group of groups.values()) {
    const current = group.filter((entry) => augmentPriority(entry.id) <= 1)
    const chosen = current.length
      ? uniqueById(current)
      : [group.slice().sort((a, b) => augmentPriority(a.id) - augmentPriority(b.id) || a.id.localeCompare(b.id))[0]]
    const chosenIds = new Set(chosen.map((entry) => entry.id))
    kept.push(...chosen)
    for (const entry of group) {
      if (chosenIds.has(entry.id)) continue
      aliases[entry.id] = chosen[0].id
    }
  }
  return { augments: uniqueById(kept), aliases }
}

function inferAugmentTier(name) {
  if (/\+\s*$/.test(name) || /\bIII\b|\b3\b/.test(name) || / III$/.test(name)) return 3
  if (/\bII\b/.test(name) || / II$/.test(name)) return 2
  if (/\bI\b/.test(name) || / I$/.test(name)) return 1
  return 2
}

function lookup(list, name) {
  const needle = norm(name)
  const exact = list.find((entry) => norm(entry.name) === needle && !/\(/.test(entry.name))
  if (exact) return exact
  return list.find((entry) => norm(entry.name) === needle) ?? null
}

function resolveNames(list, names) {
  const resolved = []
  const missing = []
  for (const name of names) {
    const hit = lookup(list, name)
    if (hit) resolved.push(hit.id)
    else missing.push(name)
  }
  return { ids: [...new Set(resolved)], missing }
}

function namesByApi(list) {
  const map = new Map()
  for (const entry of list) {
    if (entry?.apiName && entry.name) map.set(entry.apiName, entry.name)
  }
  return map
}

async function loadTft(locale) {
  console.log(`Descargando Community Dragon (${locale})...`)
  const response = await fetch(`${CDRAGON_BASE}/${locale}.json`)
  if (!response.ok) throw new Error(`Community Dragon ${locale} ${response.status}`)
  return response.json()
}

const raw = await loadTft(LOCALE)
const rawEn = await loadTft('en_us')
const set = raw.setData.find((entry) => entry.mutator === 'TFTSet18')
const setEn = rawEn.setData.find((entry) => entry.mutator === 'TFTSet18')
if (!set || !setEn) throw new Error('No encontré TFTSet18 en Community Dragon')

const champEn = namesByApi(setEn.champions)
const traitEn = namesByApi(setEn.traits)
const itemEn = namesByApi(rawEn.items)
const traitIdByName = new Map(set.traits.filter((trait) => trait.name && trait.apiName).map((trait) => [trait.name, trait.apiName]))

function withEnName(id, name) {
  const nameEn = champEn.get(id) || itemEn.get(id) || traitEn.get(id)
  return nameEn && nameEn !== name ? { nameEn } : {}
}

const champions = uniqueById(
  set.champions
    .filter((champ) => {
      if (!champ.name || !champ.apiName) return false
      if (String(champ.apiName).startsWith('DA_Elderwood18_')) return true
      return champ.traits?.length && champ.cost >= 1 && champ.cost <= 5
    })
    .map((champ) => ({
      id: champ.apiName,
      name: champ.name,
      ...withEnName(champ.apiName, champ.name),
      cost: champ.cost || 0,
      traits: (champ.traits ?? []).map((trait) => traitIdByName.get(trait) ?? trait),
      icon: iconUrl(champ.squareIcon || champ.tileIcon || champ.icon),
    })),
)

const traits = uniqueById(
  set.traits
    .filter((trait) => trait.name && trait.apiName)
    .map((trait) => ({
      id: trait.apiName,
      name: trait.name,
      ...withEnName(trait.apiName, trait.name),
      icon: iconUrl(trait.icon),
      desc: stripDesc(trait.desc),
    })),
)

const items = uniqueById(
  raw.items
    .filter((item) => item.name && typeof item.apiName === 'string')
    .flatMap((item) => {
      if (item.apiName.startsWith('DA_Component_')) {
        return [
          {
            id: item.apiName,
            name: item.name,
            ...withEnName(item.apiName, item.name),
            kind: 'component',
            composition: [],
            icon: iconUrl(item.icon),
            unique: Boolean(item.unique),
          },
        ]
      }
      if (Array.isArray(item.composition) && item.composition.length === 2 && item.apiName.startsWith('DA_')) {
        const spatulaLike = item.composition.some((part) => /Spatula|FryingPan/i.test(part))
        const kind = /emblem/i.test(item.name) || /Emblema/i.test(item.name) || spatulaLike ? 'emblem' : 'completed'
        return [
          {
            id: item.apiName,
            name: item.name,
            ...withEnName(item.apiName, item.name),
            kind,
            composition: item.composition,
            icon: iconUrl(item.icon),
            unique: Boolean(item.unique),
          },
        ]
      }
      if (/^DA_(Item_)?Artifact_/.test(item.apiName) || (item.apiName.startsWith('DA_') && /Radiant$/i.test(item.apiName))) {
        return [
          {
            id: item.apiName,
            name: item.name,
            ...withEnName(item.apiName, item.name),
            kind: 'completed',
            composition: item.composition ?? [],
            icon: iconUrl(item.icon),
            unique: true,
          },
        ]
      }
      if (/^DA_18_Emblem/.test(item.apiName)) {
        return [
          {
            id: item.apiName,
            name: item.name,
            ...withEnName(item.apiName, item.name),
            kind: 'emblem',
            composition: item.composition ?? [],
            icon: iconUrl(item.icon),
            unique: true,
          },
        ]
      }
      return []
    }),
)

const setAugmentIds = new Set(set.augments ?? [])
const { augments, aliases: augmentAliases } = uniqueSetAugments(
  raw.items
    .filter((item) => item.isAugment && item.name && setAugmentIds.has(item.apiName))
    .map((item) => ({
      id: item.apiName,
      name: item.name,
      ...withEnName(item.apiName, item.name),
      icon: iconUrl(item.icon),
      desc: stripDesc(item.desc),
      tier: inferAugmentTier(item.name),
    })),
)
augments.sort((a, b) => {
  const aNew = a.id.startsWith('DA_18_') ? 0 : 1
  const bNew = b.id.startsWith('DA_18_') ? 0 : 1
  if (aNew !== bNew) return aNew - bNew
  return a.tier - b.tier || a.name.localeCompare(b.name, 'es')
})

const catalog = {
  patch: PATCH,
  set: SET,
  setName: SET_NAME,
  locale: 'es_AR',
  source: `${CDRAGON_BASE}/${LOCALE}.json`,
  updatedAt: new Date().toISOString(),
  champions,
  traits,
  items,
  augments,
  augmentAliases,
}

function byEnglishName(list) {
  return list.map((entry) => ({ ...entry, name: entry.nameEn || entry.name }))
}

const missing = []
const comps = META_COMPS.map((comp) => {
  const units = resolveNames(byEnglishName(champions), comp.units)
  const carry = resolveNames(byEnglishName(champions), comp.carry)
  const itemsHit = resolveNames(byEnglishName(items), comp.items)
  const augs = resolveNames(byEnglishName(augments), comp.augments)
  const traitIds = resolveNames(byEnglishName(traits), comp.traits)
  missing.push(
    ...units.missing.map((name) => `${comp.name}: unit ${name}`),
    ...itemsHit.missing.map((name) => `${comp.name}: item ${name}`),
    ...augs.missing.map((name) => `${comp.name}: augment ${name}`),
    ...traitIds.missing.map((name) => `${comp.name}: trait ${name}`),
  )
  return {
    id: norm(comp.name),
    name: comp.name,
    tier: comp.tier,
    style: comp.style,
    difficulty: comp.difficulty,
    unitIds: units.ids,
    carryIds: carry.ids,
    itemIds: itemsHit.ids,
    augmentIds: augs.ids,
    traitIds: traitIds.ids,
    avgPlace: comp.avgPlace,
    pickRate: comp.pickRate,
    winRate: comp.winRate,
    top4: comp.top4,
  }
})

const meta = {
  patch: PATCH,
  set: SET,
  setName: SET_NAME,
  sources: {
    metatft: 'https://www.metatft.com/comps',
    tftacademy: 'https://tftacademy.com/tierlist/comps/set18',
  },
  notes: [
    'Snapshot de MetaTFT ranked Platino+, versión 18.2b, últimos 3 días.',
    'TFT Academy no tiene comps S en 18.2b; las recomendaciones usan el tierlist de datos de MetaTFT.',
  ],
  updatedAt: new Date().toISOString(),
  comps,
}

await mkdir(DATA_DIR, { recursive: true })
await writeFile(join(DATA_DIR, 'catalog.json'), JSON.stringify(catalog))
await writeFile(join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2))

if (existsSync(join(ROOT, 'scripts', 'academy.json'))) {
  const { spawnSync } = await import('node:child_process')
  spawnSync(process.execPath, [join(ROOT, 'scripts', 'apply-academy.mjs')], { stdio: 'inherit' })
}

console.log(
  JSON.stringify(
    {
      champions: champions.length,
      traits: traits.length,
      items: items.length,
      components: items.filter((item) => item.kind === 'component').length,
      completed: items.filter((item) => item.kind === 'completed').length,
      emblems: items.filter((item) => item.kind === 'emblem').length,
      augments: augments.length,
      augmentAliases: Object.keys(augmentAliases).length,
      comps: comps.length,
      missing: [...new Set(missing)],
    },
    null,
    2,
  ),
)
