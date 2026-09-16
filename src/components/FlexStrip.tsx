import type { Champion, FlexOption } from '../lib/types'

type Props = {
  rows: FlexOption[]
  champs: Map<string, Champion>
  compact?: boolean
  onPickUnit: (id: string) => void
}

export function FlexStrip({ rows, champs, compact = false, onPickUnit }: Props) {
  if (!rows.length) return null
  return (
    <div className={compact ? 'flex-units compact' : 'flex-units'}>
      <span>Unidades flex</span>
      <p>Reemplazos si no tenés el team ideal</p>
      <div className="flex-champs">
        {rows.map((row) => {
          const champ = champs.get(row.id)
          const missing = champs.get(row.replaces)
          if (!champ) return null
          return (
            <button
              key={`${row.id}-${row.replaces}`}
              type="button"
              className="flex-champ"
              title={missing ? `${champ.name} · reemplazo de ${missing.name}` : champ.name}
              onClick={() => onPickUnit(row.id)}
            >
              <img src={champ.icon} alt="" />
              {compact ? null : <strong>{champ.name}</strong>}
              {missing && !compact ? <em>por {missing.name}</em> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
