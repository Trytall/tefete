import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { BoardPreview } from './components/BoardPreview'
import { CompRow } from './components/CompRow'
import { EntityGrid } from './components/EntityGrid'
import { TraitMeter } from './components/TraitMeter'
import catalogJson from './data/catalog.json'
import metaJson from './data/meta.json'
import { compsFromAcademyGuides, fetchAcademyGuides } from './lib/academy'
import { augmentTierEs, difficultyEs, styleEs } from './lib/es'
import { recipeParts, recipeTitle } from './lib/recipes'
import { addCount, craftableFrom, recommendComps, totalCount } from './lib/recommend'
import { buildShareUrl, formatCompText, isPinnedApp, loadSavedSession, parseShare, saveSession } from './lib/share'
import { traitCounts } from './lib/traits'
import type { Augment, Catalog, Champion, CompMatch, CompTier, Inventory, MetaSnapshot, RankSort, Trait } from './lib/types'
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
const ALL_TIERS: CompTier[] = ['S', 'A', 'B', 'C']
const META_CACHE = 'tefete-meta'

function loadCachedMeta(): MetaSnapshot | null {
  try {
    const raw = window.localStorage.getItem(META_CACHE)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MetaSnapshot
    if (!parsed?.comps?.length) return null
    return parsed
  } catch {
    return null
  }
}

type AugmentScope = 'all' | 1 | 2 | 3 | 'new'

function traitHue(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  return [24, 38, 152, 174, 198, 262, 312, 8][hash % 8]
}


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
  const [liveMeta, setLiveMeta] = useState<MetaSnapshot>(() => loadCachedMeta() ?? meta)
  const [refreshing, setRefreshing] = useState(false)
  const [pins, setPins] = useState<string[]>(() => bootSaved?.pins ?? [])
  const [tiers, setTiers] = useState<CompTier[]>(() =>
    bootSaved?.tiers?.length ? bootSaved.tiers.filter((tier): tier is CompTier => ALL_TIERS.includes(tier)) : [...ALL_TIERS],
  )
  const [traitFilter, setTraitFilter] = useState<string | null>(() => bootSaved?.traitFilter ?? null)
  const [augmentScope, setAugmentScope] = useState<AugmentScope>('all')
  const [settingsOpen, setSettingsOpen] = useState(false)

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
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'Escape' && settingsOpen) {
        event.preventDefault()
        setSettingsOpen(false)
        return
      }
      if (event.key !== 't' && event.key !== 'T') return
      if (mode !== 'play') return
      event.preventDefault()
      setPanelOpen((open) => !open)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, settingsOpen])

  useEffect(() => {
    saveSession({ items: itemCounts, augments, units, sort, onlyMatches, pins, tiers, traitFilter })
  }, [itemCounts, augments, units, sort, onlyMatches, pins, tiers, traitFilter])

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
  const boardTraits = useMemo(() => traitCounts(units, catalog), [units])
  const ranked = useMemo(
    () => recommendComps({ items: itemCounts, augments, units }, catalog, liveMeta, sort),
    [itemCounts, augments, units, sort, liveMeta],
  )
  const visible = useMemo(() => {
    const activeTiers = new Set(tiers.length ? tiers : ALL_TIERS)
    let list = onlyMatches && hasInventory(inventory)
      ? ranked.filter((entry) => entry.itemHits.length + entry.craftHits.length + entry.augmentHits.length + entry.unitHits.length > 0)
      : ranked
    list = list.filter((entry) => activeTiers.has(entry.comp.tier))
    if (traitFilter) list = list.filter((entry) => entry.comp.traitIds.includes(traitFilter))
    const pinned = new Set(pins)
    return [...list].sort((a, b) => Number(pinned.has(b.comp.id)) - Number(pinned.has(a.comp.id)))
  }, [ranked, onlyMatches, inventory, tiers, traitFilter, pins])
  const presentTiers = useMemo(() => new Set(liveMeta.comps.map((comp) => comp.tier)), [liveMeta])
  const traitOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const comp of liveMeta.comps) {
      for (const id of comp.traitIds) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => traitsById.get(id))
      .filter((trait): trait is Trait => Boolean(trait))
  }, [liveMeta])
  const visibleAugments = useMemo(() => {
    if (augmentScope === 'all') return catalog.augments
    if (augmentScope === 'new') return catalog.augments.filter((aug) => aug.id.startsWith('DA_18_'))
    return catalog.augments.filter((aug) => aug.tier === augmentScope)
  }, [augmentScope])
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
    setSettingsOpen(false)
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

  function togglePin(id: string) {
    setPins((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))
  }

  function toggleTier(tier: CompTier) {
    if (tier === 'S' && !presentTiers.has('S')) return
    setTiers((current) => {
      const next = current.includes(tier) ? current.filter((value) => value !== tier) : [...current, tier]
      return next.length ? next : [tier]
    })
  }

  async function refreshMeta() {
    setRefreshing(true)
    try {
      const guides = await fetchAcademyGuides()
      const comps = compsFromAcademyGuides(guides, catalog)
      if (!comps.length) throw new Error('empty')
      const next: MetaSnapshot = { ...meta, comps, updatedAt: new Date().toISOString() }
      window.localStorage.setItem(META_CACHE, JSON.stringify(next))
      setLiveMeta(next)
      setToast('Meta actualizado')
    } catch {
      setToast('No se pudo actualizar el meta')
    }
    setRefreshing(false)
    window.setTimeout(() => setToast(''), 1800)
  }

  useEffect(() => {
    if (play) return
    const age = Date.now() - Date.parse(liveMeta.updatedAt || '')
    if (!Number.isFinite(age) || age > 6 * 60 * 60 * 1000) void refreshMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play])

  if (play && !panelOpen) {
    return (
      <button type="button" className="play-handle" onClick={() => setPanelOpen(true)} title="Abrir tefete">
        T
      </button>
    )
  }

  return (
    <div className={play ? 'app play' : 'app desk'}>
      {play ? (
        <header className="topbar">
          <div>
            <p className="eyebrow">Overlay de partida</p>
            <h1>tefete</h1>
          </div>
          <div className="patch">
            <strong>Set {catalog.set}</strong>
            <span>{catalog.setName}</span>
            <span className="badge">Versión {catalog.patch}</span>
            <div className="mode-row">
              <button type="button" className="chip on" onClick={() => chooseMode('play')}>
                Partida
              </button>
              <button type="button" className="chip" onClick={() => chooseMode('desk')}>
                Monitor
              </button>
              <button type="button" className="ghost" onClick={() => setPanelOpen(false)}>
                T
              </button>
            </div>
          </div>
        </header>
      ) : null}

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
              <div className="craft">
                <span>Se puede armar</span>
                {craftable.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="chip faint"
                    onClick={() => toggleItem(item.id)}
                    title={recipeTitle(item, catalog)}
                  >
                    <img src={item.icon} alt="" />
                    {play ? item.name : recipeTitle(item, catalog)}
                  </button>
                ))}
              </div>
            ) : null}
            <TraitMeter rows={boardTraits} compact={compact} />
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
                getTitle={(item) => recipeTitle(item, catalog)}
                renderExtra={(item) => {
                  const parts = recipeParts(item, catalog)
                  if (!parts.length || compact) return null
                  return parts.map((part) => <img key={part.id} src={part.icon} alt={part.name} title={part.name} />)
                }}
              />
            </>
          ) : null}

          {tab === 'augments' ? (
            <>
              <div className="scope">
                {(
                  [
                    ['all', play ? 'Todos' : 'Todos'],
                    [1, 'Plata'],
                    [2, 'Oro'],
                    [3, play ? 'Prism.' : 'Prismático'],
                    ['new', 'Nuevos'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={String(id)}
                    type="button"
                    className={augmentScope === id ? 'chip on' : 'chip'}
                    onClick={() => setAugmentScope(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <EntityGrid
                compact={compact}
                title="Aumentos"
                hint={compact ? undefined : 'Pool del set 18: nuevos y los que volvieron.'}
                entities={visibleAugments}
                selected={augments}
                onToggle={toggleAugment}
                onRemove={(id) => setAugments((current) => current.filter((value) => value !== id))}
                renderMeta={(aug: Augment) => augmentTierEs(aug.tier)}
              />
            </>
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
          {play ? null : (
            <div className="comp-dock">
              <header className="recs-head">
                <div>
                  <h2>Comps</h2>
                  <p>
                    {visible.length} · Academy {liveMeta.patch} ·{' '}
                    {new Date(liveMeta.updatedAt).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="sorts">
                  {(['meta', 'pick', 'avg', 'win'] as RankSort[]).map((key) => (
                    <button key={key} type="button" className={sort === key ? 'chip on' : 'chip'} onClick={() => setSort(key)}>
                      {key === 'meta' ? 'Meta' : key === 'pick' ? 'Pick' : key === 'avg' ? 'Prom.' : 'Win'}
                    </button>
                  ))}
                </div>
              </header>
              <TierFilters
                presentTiers={presentTiers}
                tiers={tiers}
                traitFilter={traitFilter}
                traitOptions={traitOptions}
                play={false}
                onToggleTier={toggleTier}
                onTrait={setTraitFilter}
              />
              <label className="check">
                <input type="checkbox" checked={onlyMatches} onChange={(event) => setOnlyMatches(event.target.checked)} />
                Solo lo que tengo
              </label>
              <CompCards
                visible={visible}
                play={false}
                openComp={openComp}
                activeId={active?.comp.id ?? null}
                pins={pins}
                onOpen={setOpenComp}
                onPin={togglePin}
              />
              {visible.length === 0 ? (
                <p className="empty">
                  Nada coincide con ese inventario.
                  {onlyMatches ? ' Desmarcá “Solo lo que tengo” para ver todas las comps.' : ''}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <section className="recs">
        {play ? (
          <>
            <header className="recs-head">
              <div>
                <h2>Comps</h2>
                <p>
                  {visible.length} · Academy {liveMeta.patch}
                </p>
              </div>
              <div className="sorts">
                {(['meta', 'pick', 'avg', 'win'] as RankSort[]).map((key) => (
                  <button key={key} type="button" className={sort === key ? 'chip on' : 'chip'} onClick={() => setSort(key)}>
                    {key === 'meta' ? 'Meta' : key === 'pick' ? 'Pick' : key === 'avg' ? 'Prom.' : 'Win'}
                  </button>
                ))}
              </div>
            </header>
            <TierFilters
              presentTiers={presentTiers}
              tiers={tiers}
              traitFilter={traitFilter}
              traitOptions={traitOptions}
              play
              onToggleTier={toggleTier}
              onTrait={setTraitFilter}
            />
            <label className="check">
              <input type="checkbox" checked={onlyMatches} onChange={(event) => setOnlyMatches(event.target.checked)} />
              Solo lo que tengo
            </label>
            <CompCards
              visible={visible}
              play
              openComp={openComp}
              activeId={active?.comp.id ?? null}
              pins={pins}
              onOpen={setOpenComp}
              onPin={togglePin}
            />
          </>
        ) : (
          <>
            {headline ? <p className="headline">{headline}</p> : null}
            {active ? <CompDetail key={active.comp.id} entry={active} play={false} /> : null}
          </>
        )}
        {visible.length === 0 && play ? (
          <p className="empty">
            Nada coincide con ese inventario.
            {onlyMatches ? ' Desmarcá “Solo lo que tengo” para ver todas las comps.' : ''}
          </p>
        ) : null}
      </section>
      {play ? null : (
        <>
          <button
            type="button"
            className={settingsOpen ? 'settings-btn on' : 'settings-btn'}
            aria-expanded={settingsOpen}
            aria-controls="desk-settings"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19.1 12.9a7.6 7.6 0 0 0 0-1.8l2-1.5-1.9-3.3-2.4.5a7.4 7.4 0 0 0-1.6-.9L14.8 3h-3.6l-.4 2.4a7.4 7.4 0 0 0-1.6.9l-2.4-.5-1.9 3.3 2 1.5a7.6 7.6 0 0 0 0 1.8l-2 1.5 1.9 3.3 2.4-.5c.5.4 1 .7 1.6.9l.4 2.4h3.6l.4-2.4c.6-.2 1.1-.5 1.6-.9l-2.4.5 1.9-3.3-2-1.5ZM12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4Z"
              />
            </svg>
            Ajustes
          </button>
          {settingsOpen ? (
            <div className="settings-layer" onClick={() => setSettingsOpen(false)}>
              <div
                id="desk-settings"
                className="settings-card"
                role="dialog"
                aria-labelledby="settings-title"
                onClick={(event) => event.stopPropagation()}
              >
                <header className="settings-head">
                  <div>
                    <p className="eyebrow">tefete</p>
                    <h2 id="settings-title">Ajustes</h2>
                  </div>
                  <button type="button" className="ghost" onClick={() => setSettingsOpen(false)}>
                    Cerrar
                  </button>
                </header>
                <p className="settings-meta">
                  Set {catalog.set} · {catalog.setName} · <span className="badge">v{catalog.patch}</span>
                </p>
                <div className="settings-block">
                  <span>Modo</span>
                  <div className="mode-row">
                    <button type="button" className="chip" onClick={() => chooseMode('play')}>
                      Partida
                    </button>
                    <button type="button" className="chip on" onClick={() => chooseMode('desk')}>
                      Monitor
                    </button>
                  </div>
                </div>
                <div className="settings-block">
                  <span>Meta</span>
                  <button type="button" className="ghost" onClick={() => void refreshMeta()} disabled={refreshing}>
                    {refreshing ? 'Actualizando…' : 'Actualizar'}
                  </button>
                </div>
                <div className="settings-block">
                  <span>Compartir</span>
                  <div className="dock-actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => copyText('Link copiado', buildShareUrl({ mode, compId: active?.comp.id, inventory }))}
                    >
                      Copiar link
                    </button>
                    {active ? (
                      <button type="button" className="ghost" onClick={() => copyText('Build copiada', formatCompText(active, catalog))}>
                        Copiar build
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
      {toast ? (
        <p className="toast" role="status">
          {toast}
        </p>
      ) : null}
    </div>
  )
}

function TierFilters({
  presentTiers,
  tiers,
  traitFilter,
  traitOptions,
  play,
  onToggleTier,
  onTrait,
}: {
  presentTiers: Set<CompTier>
  tiers: CompTier[]
  traitFilter: string | null
  traitOptions: Trait[]
  play: boolean
  onToggleTier: (tier: CompTier) => void
  onTrait: (id: string | null) => void
}) {
  return (
    <div className="scope filters">
      {ALL_TIERS.map((tier) => {
        const blocked = tier === 'S' && !presentTiers.has('S')
        const on = !blocked && tiers.includes(tier)
        const chip = (
          <button
            type="button"
            className={on ? `chip on tier-chip tier-${tier}` : `chip tier-chip tier-${tier}${blocked ? ' blocked' : ''}`}
            disabled={blocked}
            aria-disabled={blocked}
            aria-label={blocked ? 'No hay ninguna tier s en el patch actual' : `Filtrar tier ${tier}`}
            onClick={() => onToggleTier(tier)}
          >
            {tier}
          </button>
        )
        if (!blocked) return <span key={tier}>{chip}</span>
        return (
          <span key={tier} className="tier-wrap" data-tip="No hay ninguna tier s en el patch actual">
            {chip}
          </span>
        )
      })}
      {play
        ? null
        : traitOptions.slice(0, 10).map((trait) => (
            <button
              key={trait.id}
              type="button"
              title={trait.name}
              className={traitFilter === trait.id ? 'chip trait-chip on' : 'chip trait-chip'}
              style={{ '--trait-hue': String(traitHue(trait.id)) } as CSSProperties}
              onClick={() => onTrait(traitFilter === trait.id ? null : trait.id)}
            >
              <img src={trait.icon} alt="" />
              {trait.name}
            </button>
          ))}
    </div>
  )
}

function CompCards({
  visible,
  play,
  openComp,
  activeId,
  pins,
  onOpen,
  onPin,
}: {
  visible: CompMatch[]
  play: boolean
  openComp: string | null
  activeId: string | null
  pins: string[]
  onOpen: (id: string | null | ((current: string | null) => string | null)) => void
  onPin: (id: string) => void
}) {
  return (
    <ol className={play ? 'comp-list' : 'comp-list dock'}>
      {visible.map((entry, index) => {
        const expanded = play && (openComp === entry.comp.id || (!openComp && index === 0))
        const selected = play ? expanded : activeId === entry.comp.id
        const fade = selected || index === 0 ? 0 : Math.min(index * 0.035, 0.45)
        return (
          <li
            key={entry.comp.id}
            className={['comp-card', `tone-${entry.comp.tier}`, selected ? 'on' : '', index === 0 ? 'hot' : '']
              .filter(Boolean)
              .join(' ')}
            style={{ '--fade': String(fade) } as CSSProperties}
          >
            <div className="comp-top-row">
              <button
                type="button"
                className="comp-top as-button"
                aria-pressed={selected}
                aria-current={selected ? 'true' : undefined}
                onClick={() =>
                  onOpen((current) => {
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
                    {entry.comp.avgPlace.toFixed(2)} · pick {entry.comp.pickRate.toFixed(2)}% · win {entry.comp.winRate.toFixed(1)}%
                  </p>
                </div>
              </button>
              <button
                type="button"
                className={pins.includes(entry.comp.id) ? 'pin on' : 'pin'}
                aria-pressed={pins.includes(entry.comp.id)}
                title={pins.includes(entry.comp.id) ? 'Quitar de favoritos' : 'Fijar comp'}
                onClick={() => onPin(entry.comp.id)}
              >
                ★
              </button>
            </div>
            {expanded ? <CompDetail entry={entry} play /> : null}
          </li>
        )
      })}
    </ol>
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
          <span
            key={trait.id}
            className="trait"
            style={{ '--trait-hue': String(traitHue(trait.id)) } as CSSProperties}
          >
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
      {play ? (
        <BoardPreview
          layout={entry.layout}
          champions={champsById}
          items={itemsById}
          loadouts={entry.loadouts}
          compact
        />
      ) : (
        <div className="stage">
          <BoardPreview
            layout={entry.layout}
            champions={champsById}
            items={itemsById}
            loadouts={entry.loadouts}
            named
          />
          <div className="stage-side">
            <CompRow
              catalog={catalog}
              loadouts={entry.loadouts}
              byId={{ items: itemsById, champions: champsById }}
            />
            {alts.length ? (
              <>
                <p className="board-caption">Builds alternativas</p>
                <CompRow
                  catalog={catalog}
                  loadouts={alts}
                  byId={{ items: itemsById, champions: champsById }}
                />
              </>
            ) : null}
            {entry.reasons.length ? (
              <ul className="reasons">
                {entry.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
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
