import { useState, type MouseEvent, type ReactNode } from 'react'
import { matchesSearch } from '../lib/es'

type Entity = {
  id: string
  name: string
  nameEn?: string
  label?: string
  icon: string
}

type Props<T extends Entity> = {
  title: string
  hint?: string
  entities: T[]
  selected: Record<string, number> | string[]
  onToggle: (id: string) => void
  onRemove?: (id: string) => void
  renderMeta?: (entity: T) => ReactNode
  renderExtra?: (entity: T) => ReactNode
  getTitle?: (entity: T) => string
  placeholder?: string
  compact?: boolean
}

export function EntityGrid<T extends Entity>({
  title,
  hint,
  entities,
  selected,
  onToggle,
  onRemove,
  renderMeta,
  renderExtra,
  getTitle,
  placeholder = 'Buscar…',
  compact = false,
}: Props<T>) {
  const [query, setQuery] = useState('')
  const selectedSet = Array.isArray(selected)
    ? new Set(selected)
    : new Set(Object.keys(selected))
  const counts = Array.isArray(selected) ? null : selected
  const needle = query.trim().toLowerCase()
  const visible = needle
    ? entities.filter((entity) => matchesSearch(entity, needle) || entity.label?.toLowerCase().includes(needle))
    : entities

  function handleContext(event: MouseEvent<HTMLButtonElement>, id: string) {
    if (!onRemove) return
    event.preventDefault()
    onRemove(id)
  }

  return (
    <section className={compact ? 'panel compact' : 'panel'}>
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {hint ? <p>{hint}</p> : null}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setQuery('')
          }}
          placeholder={placeholder}
          aria-label={`Buscar ${title}`}
        />
      </header>
      <div className="grid">
        {visible.map((entity) => {
          const count = counts?.[entity.id] ?? 0
          const active = selectedSet.has(entity.id)
          const tooltip = getTitle?.(entity) ?? entity.name
          return (
            <button
              key={entity.id}
              type="button"
              className={active ? 'tile selected' : 'tile'}
              onClick={() => onToggle(entity.id)}
              onContextMenu={(event) => handleContext(event, entity.id)}
              title={onRemove ? `${tooltip} · clic derecho para quitar` : tooltip}
            >
              <img src={entity.icon} alt="" loading="lazy" />
              {count > 1 ? <span className="count">{count}</span> : null}
              {renderMeta ? <span className="meta">{renderMeta(entity)}</span> : null}
              <span className="label">{entity.name}</span>
              {entity.label ? <span className="sub">{entity.label}</span> : null}
              {renderExtra ? <span className="extra">{renderExtra(entity)}</span> : null}
            </button>
          )
        })}
      </div>
      {visible.length === 0 ? <p className="empty">No hay resultados. Probá otro nombre o Esc para limpiar.</p> : null}
    </section>
  )
}
