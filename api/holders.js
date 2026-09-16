const META_URL = 'https://api-hc.metatft.com/tft-stat-api/item_detail'
const RANKS = 'PLATINUM,EMERALD,DIAMOND,MASTER,GRANDMASTER,CHALLENGER'

function parseIds(value) {
  return String(value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function rankUnits(units) {
  const ranked = []
  for (const entry of units || []) {
    const places = Array.isArray(entry.places) ? entry.places : []
    const count = places.reduce((sum, n) => sum + Number(n || 0), 0)
    if (!entry.unit || count < 80) continue
    let weighted = 0
    for (let i = 0; i < 8; i += 1) weighted += (i + 1) * Number(places[i] || 0)
    const avgPlace = weighted / count
    ranked.push({
      unitId: entry.unit,
      count,
      avgPlace: Number(avgPlace.toFixed(2)),
      winRate: Number(((places[0] / count) * 100).toFixed(1)),
      score: (5.2 - avgPlace) * Math.log1p(count),
    })
  }
  return ranked
    .sort((a, b) => b.score - a.score || a.avgPlace - b.avgPlace)
    .slice(0, 4)
    .map(({ score: _score, ...holder }) => holder)
}

export async function buildHolders(ids) {
  const items = {}
  await Promise.all(
    ids.map(async (id) => {
      const url = `${META_URL}?queue=1100&patch=current&days=3&rank=${RANKS}&permit_filter_adjustment=true&itemName=${encodeURIComponent(id)}`
      const response = await fetch(url, { headers: { accept: 'application/json' } })
      if (!response.ok) {
        items[id] = []
        return
      }
      const data = await response.json()
      items[id] = rankUnits(data.units)
    }),
  )
  return items
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost')
    const ids = parseIds(url.searchParams.get('items'))
    if (!ids.length) {
      res.status(400).json({ error: 'Falta items' })
      return
    }
    const items = await buildHolders(ids)
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(200).json({ items, updatedAt: new Date().toISOString(), source: 'https://www.metatft.com/items' })
  } catch {
    res.status(502).json({ error: 'No se pudo leer los portadores de MetaTFT' })
  }
}
