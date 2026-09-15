# tefete

Companion de TFT Set 18 · Tierras Encantadas. Marcás lo que te cayó y te recomienda comps de TFT Academy, con nombres del cliente LAS.

## Uso local

```bash
npm install
npm run dev
```

- Monitor (segundo monitor): `http://localhost:5173/?mode=desk`
- Overlay (ventana de Chrome/Edge): `npm run overlay` — abre `?mode=play&app=1`

`npm run sync` actualiza el catálogo desde Community Dragon (es_AR) y reescribe `src/data`. `npm run academy` vuelve a cruzar la API de TFT Academy.

## Producción

Está online en **https://tefete.vercel.app** (dominio gratis de Vercel).

Para volver a publicar:

```bash
npx vercel --prod --yes
```
