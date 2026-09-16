import type { Champion, HexSlot, Item, ItemLoadout } from '../lib/types'

const COST_CLASS = ['', 'cost-1', 'cost-2', 'cost-3', 'cost-4', 'cost-5']

type Props = {
  layout: HexSlot[]
  champions: Map<string, Champion>
  items?: Map<string, Item>
  loadouts?: ItemLoadout[]
  compact?: boolean
  named?: boolean
  ownedIds?: string[]
}

export function BoardPreview({
  layout,
  champions,
  items,
  loadouts = [],
  compact = false,
  named = false,
  ownedIds = [],
}: Props) {
  const labels = ['Frente', '', '', 'Atrás']
  const byChamp = new Map(loadouts.map((entry) => [entry.championId, entry.itemIds]))
  const have = new Set(ownedIds)

  return (
    <div className={compact ? 'board compact' : 'board'} aria-label="Posicionamiento">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className={`hex-row row-${row}`}>
          <span className="row-label">{labels[row]}</span>
          <div className="hexes">
            {Array.from({ length: 7 }, (_, col) => {
              const slot = layout.find((entry) => entry.row === row && entry.col === col)
              const unit = slot ? champions.get(slot.id) : undefined
              if (!slot || !unit) return <span key={col} className="hex empty" />
              const equipped = (byChamp.get(slot.id) ?? [])
                .map((id) => items?.get(id))
                .filter((item): item is Item => Boolean(item))
              return (
                <span
                  key={col}
                  className={`hex filled ${COST_CLASS[unit.cost] ?? ''} ${equipped.length ? 'has-items' : ''} ${slot.source === 'owned' ? 'owned' : ''} ${slot.source === 'flex' ? 'flex-in' : ''}`}
                  title={`${unit.name} ${slot.stars}★${slot.source === 'owned' ? ' · tu unidad' : slot.source === 'flex' ? ' · flex' : ''}`}
                >
                  <img src={unit.icon} alt={unit.name} />
                  {named ? <span className="hex-name">{unit.name}</span> : null}
                  <span className={`stars s${slot.stars}`}>{starGlyph(slot.stars)}</span>
                  {equipped.length ? (
                    <span className="hex-items">
                      {equipped.map((item) => (
                        <img
                          key={item.id}
                          className={have.has(item.id) ? 'have' : undefined}
                          src={item.icon}
                          alt={item.name}
                          title={have.has(item.id) ? `Tenés ${item.name} → dale a ${unit.name}` : `${unit.name}: ${item.name}`}
                        />
                      ))}
                    </span>
                  ) : null}
                </span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function starGlyph(stars: 1 | 2 | 3) {
  return `${stars}★`
}
