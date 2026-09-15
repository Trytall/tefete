export type ItemKind = 'component' | 'completed' | 'emblem'
export type CompTier = 'S' | 'A' | 'B' | 'C'
export type RankSort = 'meta' | 'pick' | 'avg' | 'win'
export type UnitRole = 'front' | 'flex' | 'back'

export type Champion = {
  id: string
  name: string
  nameEn?: string
  cost: number
  traits: string[]
  icon: string
}

export type Trait = {
  id: string
  name: string
  nameEn?: string
  icon: string
  desc: string
  breaks?: number[]
}

export type Item = {
  id: string
  name: string
  nameEn?: string
  kind: ItemKind
  composition: string[]
  icon: string
  unique: boolean
}

export type Augment = {
  id: string
  name: string
  nameEn?: string
  icon: string
  desc: string
  tier: number
  label?: string
}

export type Catalog = {
  patch: string
  set: number
  setName: string
  locale?: string
  source: string
  updatedAt: string
  champions: Champion[]
  traits: Trait[]
  items: Item[]
  augments: Augment[]
  augmentAliases?: Record<string, string>
}

export type MetaComp = {
  id: string
  name: string
  tier: CompTier
  style: string
  difficulty: string
  unitIds: string[]
  carryIds: string[]
  itemIds: string[]
  augmentIds: string[]
  traitIds: string[]
  loadouts?: ItemLoadout[]
  altLoadouts?: ItemLoadout[]
  itemPrio?: string[]
  board?: HexSlot[]
  avgPlace: number
  pickRate: number
  winRate: number
  top4: number
}

export type HexSlot = {
  id: string
  stars: 1 | 2 | 3
  row: number
  col: number
  role?: UnitRole
}

export type ItemLoadout = {
  championId: string
  itemIds: string[]
}

export type MetaSnapshot = {
  patch: string
  set: number
  setName: string
  sources: { metatft: string; tftacademy: string }
  notes: string[]
  updatedAt: string
  comps: MetaComp[]
}

export type Inventory = {
  items: Record<string, number>
  augments: string[]
  units: string[]
}

export type CompMatch = {
  comp: MetaComp
  score: number
  itemHits: string[]
  craftHits: string[]
  augmentHits: string[]
  unitHits: string[]
  reasons: string[]
  layout: HexSlot[]
  loadouts: ItemLoadout[]
}
