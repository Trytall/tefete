import type { Champion, Item } from '../lib/types'
import type { ItemPlace } from '../lib/place'

const SOURCE: Record<ItemPlace['source'], string> = {
  build: 'lo pide esta comp',
  alt: 'en la build alternativa',
  fit: 'el mejor de este team',
}

type Props = {
  rows: ItemPlace[]
  items: Map<string, Item>
  champs: Map<string, Champion>
  compact?: boolean
  onPickUnit: (id: string) => void
}

export function ItemPlaceStrip({ rows, items, champs, compact = false, onPickUnit }: Props) {
  if (!rows.length) return null
  return (
    <div className={compact ? 'item-places compact' : 'item-places'}>
      <span>Tus objetos en esta build</span>
      {rows.map((row) => {
        const item = items.get(row.itemId)
        if (!item) return null
        const units = row.championIds.map((id) => champs.get(id)).filter((champ): champ is Champion => Boolean(champ))
        if (!units.length) return null
        return (
          <div key={row.itemId} className="item-place">
            <img src={item.icon} alt="" title={item.name} />
            <div>
              <p>
                {item.name}
                {row.craftable ? <em> · se puede armar</em> : null}
                <em> · {SOURCE[row.source]}</em>
              </p>
              <div className="holder-champs">
                {units.map((champ) => (
                  <button
                    key={`${row.itemId}-${champ.id}`}
                    type="button"
                    className="holder-champ on"
                    title={`Dale ${item.name} a ${champ.name}`}
                    onClick={() => onPickUnit(champ.id)}
                  >
                    <img src={champ.icon} alt="" />
                    {compact ? null : <strong>{champ.name}</strong>}
                    <span>Dale acá</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function CompSlamRow({
  rows,
  items,
  champs,
}: {
  rows: ItemPlace[]
  items: Map<string, Item>
  champs: Map<string, Champion>
}) {
  if (!rows.length) return null
  return (
    <div className="slam-row" aria-label="Dónde slaméar tus objetos en esta build">
      {rows.slice(0, 4).map((row) => {
        const item = items.get(row.itemId)
        const champ = champs.get(row.championIds[0] ?? '')
        if (!item || !champ) return null
        const alts = row.championIds
          .slice(1)
          .map((id) => champs.get(id)?.name)
          .filter(Boolean)
        return (
          <span
            key={row.itemId}
            className="slam-chip"
            title={
              alts.length
                ? `Dale ${item.name} a ${champ.name} (o ${alts.join(', ')})`
                : `Dale ${item.name} a ${champ.name}`
            }
          >
            <img src={item.icon} alt="" />
            <span aria-hidden="true">→</span>
            <img src={champ.icon} alt="" />
            <em>{champ.name}</em>
          </span>
        )
      })}
    </div>
  )
}
