import type { Catalog, Champion, Item, ItemLoadout } from '../lib/types'

const COST_CLASS = ['', 'cost-1', 'cost-2', 'cost-3', 'cost-4', 'cost-5']

type Props = {
  catalog: Catalog
  loadouts: ItemLoadout[]
  byId: {
    items: Map<string, Item>
    champions: Map<string, Champion>
  }
  compact?: boolean
}

export function CompRow({ catalog, loadouts, byId, compact = false }: Props) {
  if (!loadouts.length) return null

  return (
    <div className={compact ? 'loadouts compact' : 'loadouts'}>
      {loadouts.map((loadout, index) => {
        const unit = byId.champions.get(loadout.championId)
        if (!unit) return null
        return (
          <div key={`${loadout.championId}-${index}`} className="loadout">
            <span className={`portrait ${COST_CLASS[unit.cost] ?? ''}`} title={unit.name}>
              <img src={unit.icon} alt={unit.name} />
            </span>
            <div className="loadout-meta">
              {compact ? null : (
                <span className="loadout-name">
                  {unit.name}
                  {loadout.kind === 'owned' ? <em> · tu unidad</em> : null}
                  {loadout.kind === 'flex' ? <em> · flex</em> : null}
                </span>
              )}
              <div className="item-row">
                {loadout.itemIds.map((id) => {
                  const item = byId.items.get(id)
                  if (!item) return null
                  const parts = item.composition
                    .map((partId) => catalog.items.find((entry) => entry.id === partId)?.name)
                    .filter(Boolean)
                    .join(' + ')
                  return (
                    <img
                      key={`${loadout.championId}-${id}`}
                      src={item.icon}
                      alt={item.name}
                      title={parts ? `${unit.name}: ${item.name} (${parts})` : `${unit.name}: ${item.name}`}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
