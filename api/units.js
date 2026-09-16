const DETAIL_URL = 'https://api-hc.metatft.com/tft-stat-api/unit_detail'
const ITEMS_URL = 'https://api-hc.metatft.com/tft-comps-api/unit_items_processed'
const RANKS = 'PLATINUM,EMERALD,DIAMOND,MASTER,GRANDMASTER,CHALLENGER'

let itemsCache = { at: 0, map: {} }

function parseIds(value) {
  return String(value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 12)
}

function cellToHex(cell) {
  const n = Number(String(cell || '').replace(/\D/g, ''))
  if (!n || n < 1 || n > 28) return null
  const index = n - 1
  return { row: 3 - Math.floor(index / 7), col: index % 7 }
}

async function processedItems() {
  if (Date.now() - itemsCache.at < 15 * 60 * 1000 && Object.keys(itemsCache.map).length) return itemsCache.map
  const response = await fetch(`${ITEMS_URL}?queue=1100&patch=current&days=3&rank=${RANKS}`, {
    headers: { accept: 'application/json' },
  })
  if (!response.ok) return itemsCache.map
  const data = await response.json()
  const map = {}
  for (const [id, row] of Object.entries(data.units || {})) {
    map[id] = (row.items || []).map((item) => item.itemName).filter(Boolean).slice(0, 6)
  }
  itemsCache = { at: Date.now(), map }
  return map
}

function rankDetailItems(items) {
  const ranked = []
  for (const entry of items || []) {
    const places = Array.isArray(entry.places) ? entry.places : []
    const count = places.reduce((sum, n) => sum + Number(n || 0), 0)
    if (!entry.itemName || count < 40) continue
    let weighted = 0
    for (let i = 0; i < 8; i += 1) weighted += (i + 1) * Number(places[i] || 0)
    ranked.push({ itemId: entry.itemName, score: (5.2 - weighted / count) * Math.log1p(count) })
  }
  return ranked.sort((a, b) => b.score - a.score).slice(0, 6).map((entry) => entry.itemId)
}

export async function buildUnitProfiles(ids) {
  const items = await processedItems()
  const units = {}
  await Promise.all(
    ids.map(async (id) => {
      const url = `${DETAIL_URL}?queue=1100&patch=current&days=3&rank=${RANKS}&permit_filter_adjustment=true&unit=${encodeURIComponent(id)}`
      let row = 3
      let col = 3
      let itemIds = items[id] ?? []
      try {
        const response = await fetch(url, { headers: { accept: 'application/json' } })
        if (response.ok) {
          const data = await response.json()
          const top = [...(data.position || [])].sort((a, b) => Number(b.count || 0) - Number(a.count || 0))[0]
          const hex = cellToHex(top?.position)
          if (hex) {
            row = hex.row
            col = hex.col
          }
          if (!itemIds.length) itemIds = rankDetailItems(data.items)
        }
      } catch {
        /* keep processed items / default hex */
      }
      units[id] = { itemIds: itemIds.slice(0, 6), row, col }
    }),
  )
  return units
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost')
    const ids = parseIds(url.searchParams.get('ids'))
    if (!ids.length) {
      res.status(400).json({ error: 'Falta ids' })
      return
    }
    const units = await buildUnitProfiles(ids)
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(200).json({ units, updatedAt: new Date().toISOString(), source: 'https://www.metatft.com' })
  } catch {
    res.status(502).json({ error: 'No se pudo leer unidades de MetaTFT' })
  }
}
