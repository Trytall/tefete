import { useEffect, useMemo, useState } from 'react'
import { BoardPreview } from './components/BoardPreview'
import { CompRow } from './components/CompRow'
import { EntityGrid } from './components/EntityGrid'
import catalogJson from './data/catalog.json'
import metaJson from './data/meta.json'
import { difficultyEs, styleEs } from './lib/es'
import { addCount, craftableFrom, recommendComps, totalCount } from './lib/recommend'
import { buildShareUrl, formatCompText, isPinnedApp, loadSavedSession, parseShare, saveSession } from './lib/share'
import type { Catalog, Champion, CompMatch, Inventory, MetaSnapshot, RankSort, Trait } from './lib/types'
import './App.css'

const catalog = catalogJson as Catalog
const meta = metaJson as MetaSnapshot

const itemsById = new Map(catalog.items.map((item) => [item.id, item]))
const champsById = new Map(catalog.champions.map((champ) => [champ.id, champ]))
const augsById = new Map(catalog.augments.map((aug) => [aug.id, aug]))
const traitsById = new Map(catalog.traits.map((trait) => [trait.id, trait]))

const components = catalog.items.filter((item) => item.kind === 'component')
const completed = catalog.items.filter((item) => item.kind === 'completed')
const emblems = catalog.items.filter((item) => item.kind === 'emblem')
const champions = [...catalog.champions]
  .filter((champ) => champ.cost >= 1 && champ.cost <= 5 && champ.traits.length > 0)
  .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name, 'es'))

type Tab = 'items' | 'augments' | 'units'
type ItemGroup = 'components' | 'completed' | 'emblems'
type Mode = 'play' | 'desk'

function readMode(): Mode {
  const query = new URLSearchParams(window.location.search).get('mode')
  if (query === 'desk' || query === 'monitor') return 'desk'
  if (query === 'play' || query === 'overlay') return 'play'
  if (window.localStorage.getItem('tefete-mode') === 'play') return 'play'
  return 'desk'
}

function persistMode(mode: Mode) {
  window.localStorage.setItem('tefete-mode', mode)
  const url = new URL(window.location.href)
  url.searchParams.set('mode', mode)
  window.history.replaceState(null, '', url)
}

const bootShare = parseShare(window.location.search, catalog)
const bootSaved = loadSavedSession()


export default function App() {
  const [mode, setMode] = useState<Mode>(readMode)
  const [panelOpen, setPanelOpen] = useState(true)
  const [tab, setTab] = useState<Tab>('items')
  const [itemGroup, setItemGroup] = useState<ItemGroup>('components')
  const [itemCounts, setItemCounts] = useState<Record<string, number>>(
    () => bootShare.inventory?.items ?? bootSaved?.items ?? {},
  )
  const [augments, setAugments] = useState<string[]>(() => {
    const raw = bootShare.inventory?.augments ?? bootSaved?.augments ?? []
    return raw
      .map((id) => (augsById.has(id) ? id : catalog.augmentAliases?.[id]))
      .filter((id): id is string => Boolean(id && augsById.has(id)))
      .slice(0, 3)
  })
  const [units, setUnits] = useState<string[]>(() => bootShare.inventory?.units ?? bootSaved?.units ?? [])
  const [onlyMatches, setOnlyMatches] = useState(() => bootSaved?.onlyMatches ?? true)
  const [sort, setSort] = useState<RankSort>(() =>
    bootSaved?.sort === 'pick' || bootSaved?.sort === 'avg' || bootSaved?.sort === 'win' ? bootSaved.sort : 'meta',
  )
  const [openComp, setOpenComp] = useState<string | null>(() => bootShare.compId)
  const [invOpen, setInvOpen] = useState(() => readMode() === 'desk')
  const [toast, setToast] = useState('')

  const inventory: Inventory = { items: itemCounts, augments, units }
  const play = mode === 'play'
  const compact = play

  useEffect(() => {
    document.documentElement.lang = 'es-AR'
    document.documentElement.classList.toggle('play', play)
    document.documentElement.classList.toggle('desk', !play)
    document.body.classList.toggle('play', play)
    document.body.classList.toggle('desk', !play)
    persistMode(mode)
    if (play) {
      setInvOpen(false)
      setItemGroup((group) => (group === 'emblems' ? 'components' : group))
    } else setInvOpen(true)
  }, [mode, play])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 't' && event.key !== 'T') return
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (mode !== 'play') return
      event.preventDefault()
      setPanelOpen((open) => !open)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  useEffect(() => {
    saveSession({ items: itemCounts, augments, units, sort, onlyMatches })
  }, [itemCounts, augments, units, sort, onlyMatches])

  useEffect(() => {
    if (!isPinnedApp()) return
    const screen = window.screen as Screen & { availLeft?: number; availTop?: number }
    try {
      if (mode === 'play') {
        if (!panelOpen) {
          window.resizeTo(64, 96)
          window.moveTo((screen.availLeft ?? 0) + 8, Math.round((window.screen.availHeight || 800) * 0.26))
        } else {
          window.resizeTo(280, Math.min(860, (window.screen.availHeight || 900) - 60))
          window.moveTo((screen.availLeft ?? 0) + 6, (screen.availTop ?? 0) + 32)
        }
        return
      }
      if (window.outerWidth < 900) {
        const width = Math.min(1480, window.screen.availWidth || 1280)
        const height = Math.min(960, (window.screen.availHeight || 900) - 40)
        window.resizeTo(width, height)
      }
    } catch {
      /* el navegador embebido no deja redimensionar */
    }
  }, [mode, panelOpen])

  const craftable = useMemo(() => craftableFrom(itemCounts, catalog), [itemCounts])
  const ranked = useMemo(
    () => recommendComps({ items: itemCounts, augments, units }, catalog, meta, sort),
    [itemCounts, augments, units, sort],
  )
  const visible = onlyMatches && hasInventory(inventory)
    ? ranked.filter((entry) => entry.itemHits.length + entry.craftHits.length + entry.augmentHits.length + entry.unitHits.length > 0)
    : ranked
  const headline = rankingHeadline(visible)
  const active =
    visible.find((entry) => entry.comp.id === openComp) ?? visible[0] ?? null

  useEffect(() => {
    const node = document.querySelector<HTMLElement>('.comp-list .comp-card.on')
    node?.scrollIntoView({ block: 'nearest' })
  }, [active?.comp.id, play])

  function chooseMode(next: Mode) {
    setMode(next)
    setPanelOpen(true)
  }

  async function copyText(ok: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setToast(ok)
    } catch {
      setToast('No se pudo copiar')
    }
    window.setTimeout(() => setToast(''), 1800)
  }

  function toggleItem(id: string) {
    setItemCounts((current) => addCount(current, id, 1))
  }

  function removeItem(id: string) {
    setItemCounts((current) => addCount(current, id, -1))
  }

  function toggleAugment(id: string) {
    setAugments((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id].slice(0, 3)))
  }

  function toggleUnit(id: string) {
    setUnits((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
  }

  if (play && !panelOpen) {
    return (
      <button type="button" className="play-handle" onClick={() => setPanelOpen(true)} title="Abrir tefete">
        T
      </button>
    )
  }

  return (
    <div className={play ? 'app play' : 'app desk'}>
      <header className="topbar">
        <div>
          <p className="eyebrow">{play ? 'Overlay de partida' : 'Segundo monitor'}</p>
          <h1>tefete</h1>
        </div>
        <div className="patch">
          <strong>Set {catalog.set}</strong>
          <span>{catalog.setName}</span>
          <span className="badge">Versión {catalog.patch}</span>
          <div className="mode-row">
            <button type="button" className={play ? 'chip on' : 'chip'} onClick={() => chooseMode('play')}>
              Partida
            </button>
            <button type="button" className={!play ? 'chip on' : 'chip'} onClick={() => chooseMode('desk')}>
              Monitor
            </button>
            {play ? (
              <button type="button" className="ghost" onClick={() => setPanelOpen(false)}>
                T
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {play ? (
        <button type="button" className="inv-toggle" onClick={() => setInvOpen((open) => !open)}>
          Inventario · Objetos {totalCount(itemCounts)} · Aum. {augments.length} · Unid. {units.length}
          <span>{invOpen ? '▲' : '▼'}</span>
        </button>
      ) : null}

      {!play || invOpen ? (
        <div className="rail">
          <section className="inventory">
            <div className="inventory-head">
              <h2>Inventario</h2>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setItemCounts({})
                  setAugments([])
                  setUnits([])
                }}
              >
                Limpiar
              </button>
            </div>
            <SelectedStrip
              catalog={catalog}
              itemCounts={itemCounts}
              augments={augments}
              units={units}
              onRemoveItem={(id) => setItemCounts((current) => addCount(current, id, -1))}
              onRemoveAugment={(id) => setAugments((current) => current.filter((value) => value !== id))}
              onRemoveUnit={(id) => setUnits((current) => current.filter((value) => value !== id))}
            />
            {craftable.length > 0 ? (
              <p className="craft">
                Se puede armar:{' '}
                {craftable.map((item) => (
                  <span key={item.id} className="chip faint">
                    <img src={item.icon} alt="" />
                    {item.name}
                  </span>
                ))}
              </p>
            ) : null}
          </section>

          <nav className="tabs">
            <TabButton current={tab} id="items" onClick={setTab} label={`Objetos (${totalCount(itemCounts)})`} />
            <TabButton current={tab} id="augments" onClick={setTab} label={`Aumentos (${augments.length})`} />
            <TabButton current={tab} id="units" onClick={setTab} label={`Unidades (${units.length})`} />
          </nav>

          {tab === 'items' ? (
            <>
              <div className="scope">
                <button type="button" className={itemGroup === 'components' ? 'chip on' : 'chip'} onClick={() => setItemGroup('components')}>
                  {play ? 'Comp.' : 'Componentes'}
                </button>
                <button type="button" className={itemGroup === 'completed' ? 'chip on' : 'chip'} onClick={() => setItemGroup('completed')}>
                  Completos
                </button>
                {play ? null : (
                  <button type="button" className={itemGroup === 'emblems' ? 'chip on' : 'chip'} onClick={() => setItemGroup('emblems')}>
                    Emblemas
                  </button>
                )}
              </div>
              <EntityGrid
                compact={compact}
                title={itemGroup === 'components' ? 'Componentes' : itemGroup === 'completed' ? 'Completos' : 'Emblemas'}
                entities={itemGroup === 'components' ? components : itemGroup === 'completed' ? completed : emblems}
                selected={itemCounts}
                onToggle={toggleItem}
                onRemove={removeItem}
              />
            </>
          ) : null}

          {tab === 'augments' ? (
            <EntityGrid
              compact={compact}
              title="Aumentos"
              hint={compact ? undefined : 'Todos los del set 18: nuevos y los que volvieron.'}
              entities={catalog.augments}
              selected={augments}
              onToggle={toggleAugment}
              onRemove={(id) => setAugments((current) => current.filter((value) => value !== id))}
              renderMeta={(aug) => `T${aug.tier}`}
            />
          ) : null}

          {tab === 'units' ? (
            <EntityGrid
              compact={compact}
              title="Unidades"
              entities={champions}
              selected={units}
              onToggle={toggleUnit}
              onRemove={(id) => setUnits((current) => current.filter((value) => value !== id))}
              renderMeta={(champ) => champ.cost}
            />
          ) : null}
        </div>
      ) : null}

      <section className="recs">
        <header className="recs-head">
          <div>
            <h2>Comps</h2>
            <p>{visible.length} · TFT Academy 18.2b</p>
          </div>
          <div className="sorts">
            {(['meta', 'pick', 'avg', 'win'] as RankSort[]).map((key) => (
              <button key={key} type="button" className={sort === key ? 'chip on' : 'chip'} onClick={() => setSort(key)}>
                {key === 'meta' ? 'Meta' : key === 'pick' ? 'Pick' : key === 'avg' ? 'Prom.' : 'Win'}
              </button>
            ))}
            {play ? null : (
              <>
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    copyText(
                      'Link copiado',
                      buildShareUrl({ mode, compId: active?.comp.id, inventory }),
                    )
                  }
                >
                  Copiar link
                </button>
                {active ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => copyText('Build copiada', formatCompText(active, catalog))}
                  >
                    Copiar build
                  </button>
                ) : null}
              </>
            )}
          </div>
        </header>
        {headline && !play ? <p className="headline">{headline}</p> : null}
        <label className="check">
          <input type="checkbox" checked={onlyMatches} onChange={(event) => setOnlyMatches(event.target.checked)} />
          Solo lo que tengo
        </label>

        {!play && active ? <CompDetail key={active.comp.id} entry={active} play={false} /> : null}

        <ol className={play ? 'comp-list' : 'comp-list dock'}>
          {visible.map((entry, index) => {
            const expanded = play && (openComp === entry.comp.id || (!openComp && index === 0))
            const selected = play ? expanded : active?.comp.id === entry.comp.id
            return (
              <li key={entry.comp.id} className={selected ? 'comp-card on' : 'comp-card'}>
                <button
                  type="button"
                  className="comp-top as-button"
                  aria-pressed={selected}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() =>
                    setOpenComp((current) => {
                      if (!play) return entry.comp.id
                      return current === entry.comp.id ? null : entry.comp.id
                    })
                  }
                >
                  <span className={`tier tier-${entry.comp.tier}`}>{entry.comp.tier}</span>
                  <div>
                    <h3>
                      {index + 1}. {entry.comp.name}
                    </h3>
                    <p>
                      {styleEs(entry.comp.style)} · {difficultyEs(entry.comp.difficulty)} · prom.{' '}
                      {entry.comp.avgPlace.toFixed(2)} · pick {entry.comp.pickRate.toFixed(2)}% · win{' '}
                      {entry.comp.winRate.toFixed(1)}%
                    </p>
                  </div>
                </button>
                {expanded ? <CompDetail entry={entry} play /> : null}
              </li>
            )
          })}
        </ol>
        {visible.length === 0 ? (
          <p className="empty">
            Nada coincide con ese inventario.
            {onlyMatches ? ' Desmarcá “Solo lo que tengo” para ver todas las comps.' : ''}
          </p>
        ) : null}
      </section>
      {toast ? (
        <p className="toast" role="status">
          {toast}
        </p>
      ) : null}
    </div>
  )
}

function CompDetail({ entry, play }: { entry: CompMatch; play: boolean }) {
  const traits = entry.comp.traitIds
    .map((id) => traitsById.get(id))
    .filter((trait): trait is Trait => Boolean(trait))
  const prio = (entry.comp.itemPrio ?? [])
    .map((id) => itemsById.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
  const augs = entry.comp.augmentIds
    .map((id) => augsById.get(id))
    .filter((aug): aug is NonNullable<typeof aug> => Boolean(aug))
    .slice(0, 8)
  const alts = entry.comp.altLoadouts ?? []
  return (
    <div className={play ? 'comp-detail' : 'comp-detail focus'}>
      <div className="traits">
        {traits.map((trait) => (
          <span key={trait.id} className="trait">
            <img src={trait.icon} alt="" />
            {trait.name}
          </span>
        ))}
      </div>
      {play ? null : (
        <p className="board-caption">Posiciones y objetos de TFT Academy · prioridad y alternativas abajo</p>
      )}
      {play ? null : prio.length ? (
        <div className="prio-row">
          <span>Prioridad</span>
          {prio.map((item) => (
            <img key={item.id} src={item.icon} alt={item.name} title={item.name} />
          ))}
        </div>
      ) : null}
      {play ? null : augs.length ? (
        <div className="prio-row">
          <span>Aumentos</span>
          {augs.map((aug) => (
            <img key={aug.id} src={aug.icon} alt={aug.name} title={aug.name} />
          ))}
        </div>
      ) : null}
      <BoardPreview
        layout={entry.layout}
        champions={champsById}
        items={itemsById}
        loadouts={entry.loadouts}
        compact={play}
        named={!play}
      />
      {play ? null : (
        <CompRow
          catalog={catalog}
          loadouts={entry.loadouts}
          byId={{ items: itemsById, champions: champsById }}
        />
      )}
      {play || !alts.length ? null : (
        <>
          <p className="board-caption">Builds alternativas</p>
          <CompRow
            catalog={catalog}
            loadouts={alts}
            byId={{ items: itemsById, champions: champsById }}
          />
        </>
      )}
      {play ? null : (
        <ul className="reasons">
          {entry.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function rankingHeadline(visible: CompMatch[]) {
  const first = visible[0]
  const rival = visible.find((entry) => entry.comp.id !== first?.comp.id)
  if (!first || !rival) return ''
  if (first.comp.pickRate >= rival.comp.pickRate) {
    return `${first.comp.name} va primero: pick ${first.comp.pickRate.toFixed(2)}% y win ${first.comp.winRate.toFixed(1)}% (más jugada que ${rival.comp.name}, pick ${rival.comp.pickRate.toFixed(2)}%). El promedio no manda solo.`
  }
  return `${first.comp.name} va primero por promedio ${first.comp.avgPlace.toFixed(2)}. ${rival.comp.name} se juega más (pick ${rival.comp.pickRate.toFixed(2)}%): cambiá a Pick si querés la línea más común.`
}

function hasInventory(inventory: Inventory) {
  return Object.keys(inventory.items).length > 0 || inventory.augments.length > 0 || inventory.units.length > 0
}

function TabButton({
  current,
  id,
  onClick,
  label,
}: {
  current: Tab
  id: Tab
  onClick: (tab: Tab) => void
  label: string
}) {
  return (
    <button type="button" className={current === id ? 'tab on' : 'tab'} onClick={() => onClick(id)}>
      {label}
    </button>
  )
}

function SelectedStrip({
  catalog,
  itemCounts,
  augments,
  units,
  onRemoveItem,
  onRemoveAugment,
  onRemoveUnit,
}: {
  catalog: Catalog
  itemCounts: Record<string, number>
  augments: string[]
  units: string[]
  onRemoveItem: (id: string) => void
  onRemoveAugment: (id: string) => void
  onRemoveUnit: (id: string) => void
}) {
  const chips: { id: string; name: string; icon: string; count?: number; onRemove: () => void }[] = []
  for (const [id, count] of Object.entries(itemCounts)) {
    const item = itemsById.get(id)
    if (item) chips.push({ id, name: item.name, icon: item.icon, count, onRemove: () => onRemoveItem(id) })
  }
  for (const id of augments) {
    const aug = augsById.get(id)
    if (aug) chips.push({ id, name: aug.name, icon: aug.icon, onRemove: () => onRemoveAugment(id) })
  }
  for (const id of units) {
    const unit = champsById.get(id) as Champion | undefined
    if (unit) chips.push({ id, name: unit.name, icon: unit.icon, onRemove: () => onRemoveUnit(id) })
  }

  if (!chips.length) {
    return <p className="empty">Tocá abajo lo que tenés en partida.</p>
  }

  return (
    <div className="selected">
      {chips.map((chip) => (
        <button key={chip.id + chip.name} type="button" className="chip on" onClick={chip.onRemove} title={`Quitar ${chip.name}`}>
          <img src={chip.icon} alt="" />
          {chip.name}
          {chip.count && chip.count > 1 ? ` ×${chip.count}` : ''}
        </button>
      ))}
      <span className="sr-only">{catalog.setName}</span>
    </div>
  )
}
