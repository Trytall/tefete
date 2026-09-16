import type { Champion, Item } from '../lib/types'
import type { ItemHolder } from '../lib/holders'

type Props = {
  rows: { item: Item; craftable: boolean; holders: ItemHolder[] }[]
  champs: Map<string, Champion>
  compact?: boolean
  onPickUnit: (id: string) => void
}

export function HolderStrip({ rows, champs, compact = false, onPickUnit }: Props) {
  if (!rows.length) return null
  return (
    <div className={compact ? 'holders compact' : 'holders'}>
      <span>Mejor portador</span>
      {rows.map((row) => (
        <div key={row.item.id} className="holder-row">
          <img src={row.item.icon} alt="" title={row.item.name} />
          <div>
            <p>
              {row.item.name}
              {row.craftable ? <em> · se puede armar</em> : null}
            </p>
            <div className="holder-champs">
              {row.holders.length ? (
                row.holders.map((holder) => {
                  const champ = champs.get(holder.unitId)
                  if (!champ) return null
                  return (
                    <button
                      key={`${row.item.id}-${holder.unitId}`}
                      type="button"
                      className="holder-champ"
                      title={`${champ.name} · prom. ${holder.avgPlace.toFixed(2)} · win ${holder.winRate.toFixed(1)}%`}
                      onClick={() => onPickUnit(holder.unitId)}
                    >
                      <img src={champ.icon} alt="" />
                      {compact ? null : <strong>{champ.name}</strong>}
                      <span>{holder.avgPlace.toFixed(2)}</span>
                    </button>
                  )
                })
              ) : (
                <span className="holder-empty">Sin datos aún</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
