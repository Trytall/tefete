import type { Champion, Item } from '../lib/types'
import type { ItemHolder } from '../lib/holders'

type Props = {
  rows: { item: Item; craftable: boolean; holders: ItemHolder[] }[]
  champs: Map<string, Champion>
  compact?: boolean
  roster?: Set<string>
  heading?: string
  onPickUnit: (id: string) => void
}

export function HolderStrip({ rows, champs, compact = false, roster, heading = 'Mejor portador', onPickUnit }: Props) {
  if (!rows.length) return null
  return (
    <div className={compact ? 'holders compact' : 'holders'}>
      <span>{heading}</span>
      {rows.map((row) => {
        const ranked = roster
          ? [...row.holders].sort((a, b) => Number(roster.has(b.unitId)) - Number(roster.has(a.unitId)))
          : row.holders
        const inComp = roster ? ranked.filter((holder) => roster.has(holder.unitId)) : ranked
        const shown = inComp.length ? inComp : ranked
        return (
        <div key={row.item.id} className="holder-row">
          <img src={row.item.icon} alt="" title={row.item.name} />
          <div>
            <p>
              {row.item.name}
              {row.craftable ? <em> · se puede armar</em> : null}
            </p>
            <div className="holder-champs">
              {shown.length ? (
                shown.map((holder) => {
                  const champ = champs.get(holder.unitId)
                  if (!champ) return null
                  const here = roster?.has(holder.unitId)
                  return (
                    <button
                      key={`${row.item.id}-${holder.unitId}`}
                      type="button"
                      className={here ? 'holder-champ on' : 'holder-champ'}
                      title={`${champ.name} · prom. ${holder.avgPlace.toFixed(2)} · win ${holder.winRate.toFixed(1)}%`}
                      onClick={() => onPickUnit(holder.unitId)}
                    >
                      <img src={champ.icon} alt="" />
                      {compact ? null : <strong>{champ.name}</strong>}
                      <span>{here ? 'Dale acá' : holder.avgPlace.toFixed(2)}</span>
                    </button>
                  )
                })
              ) : (
                <span className="holder-empty">Sin datos aún</span>
              )}
            </div>
          </div>
        </div>
        )
      })}
    </div>
  )
}
