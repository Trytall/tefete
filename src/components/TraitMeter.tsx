import type { TraitCount } from '../lib/traits'

export function TraitMeter({ rows, compact }: { rows: TraitCount[]; compact?: boolean }) {
  if (!rows.length) return null
  return (
    <div className={compact ? 'trait-meter compact' : 'trait-meter'}>
      {rows.map((row) => (
        <span key={row.trait.id} className={row.active ? 'trait-pip on' : 'trait-pip'} title={row.trait.desc}>
          <img src={row.trait.icon} alt="" />
          {compact ? null : <span>{row.trait.name}</span>}
          <strong>
            {row.count}/{row.next}
          </strong>
        </span>
      ))}
    </div>
  )
}
