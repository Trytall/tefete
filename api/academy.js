export default async function handler(req, res) {
  try {
    const response = await fetch('https://tftacademy.com/api/tierlist/comps?set=18', {
      headers: { accept: 'application/json' },
    })
    const body = await response.text()
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(response.status).send(body)
  } catch {
    res.status(502).json({ error: 'No se pudo actualizar TFT Academy' })
  }
}
