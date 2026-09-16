/** Textos de interfaz y nombres de estilo al español latino (LAS / es_AR). */

const DIFFICULTY: Record<string, string> = {
  Easy: 'Fácil',
  Medium: 'Media',
  Hard: 'Difícil',
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
}

export function styleEs(style: string) {
  const text = String(style || '').trim()
  if (!text) return 'Estándar'
  const mapped: Record<string, string> = {
    Standard: 'Estándar',
    'Fast 9': 'Fast 9',
    '4-Cost Fast 8': 'Fast 8 · 4 de oro',
    '1-Cost Reroll': 'Rerrol de 1',
    '2-Cost Reroll': 'Rerrol de 2',
    '3-Cost Reroll': 'Rerrol de 3',
    'Lose Streak': 'Racha de derrotas',
  }
  if (mapped[text]) return mapped[text]
  return text
    .replace(/(\d+)-Cost Reroll/gi, 'Rerrol de $1')
    .replace(/(\d+)-Cost Fast (\d+)/gi, 'Fast $2 · $1 de oro')
    .replace(/lvl\s*(\d+)/gi, 'Nivel $1')
    .replace(/\bStandard\b/gi, 'Estándar')
}

export function difficultyEs(value: string) {
  return DIFFICULTY[value] ?? value
}

export function augmentTierEs(tier: number) {
  if (tier >= 3) return 'Prismático'
  if (tier <= 1) return 'Plata'
  return 'Oro'
}

/** Quita tildes y puntuación para poder buscar “lagrima” o “bf sword”. */
export function foldSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’`´.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function aliasesFromId(id?: string) {
  if (!id) return []
  const stripped = id.replace(/^(DA_18_|TFT_Augment_|TFT_Item_|TFT18_|DA_|TFT_)/i, '').replace(/_/g, ' ')
  const spaced = stripped.replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  return stripped === spaced ? [stripped] : [stripped, spaced]
}

const EN_NICKNAMES: Record<string, string[]> = {
  'bf sword': ['bf', 'bfs'],
  'infinity edge': ['ie'],
  'jeweled gauntlet': ['jg'],
  'bloodthirster': ['bt'],
  'rapid firecannon': ['rfc'],
  'rabadons deathcap': ['deathcap', 'rabadon'],
  'warmogs armor': ['warmog', 'warmogs'],
  'quicksilver': ['qss'],
  'edge of night': ['ga', 'guardian angel'],
  'needlessly large rod': ['nlr'],
  'sparring gloves': ['gloves'],
  'tear of the goddess': ['tear'],
  'hand of justice': ['hoj'],
  'titans resolve': ['titans'],
  'dragons claw': ['dc'],
  'giant slayer': ['gs'],
  'last whisper': ['lw'],
  'blue buff': ['bb'],
  'morellonomicon': ['morello'],
  'guinsoos rageblade': ['guinsoo', 'rageblade'],
  'spear of shojin': ['shojin'],
  'spatula': ['spat'],
}

function nicknamesFor(nameEn?: string) {
  if (!nameEn) return []
  const key = foldSearch(nameEn.replace(/^radiant\s+/i, ''))
  return EN_NICKNAMES[key] ?? []
}

function containsQuery(hay: string, q: string) {
  if (q.length <= 2) {
    if (hay === q) return true
    return hay.split(' ').some((token) => token === q)
  }
  return hay.includes(q)
}

export function matchesSearch(
  entity: { id?: string; name: string; nameEn?: string; label?: string },
  needle: string,
) {
  const q = foldSearch(needle)
  if (!q) return true
  const haystacks = [entity.name, entity.nameEn, entity.label, ...aliasesFromId(entity.id), ...nicknamesFor(entity.nameEn)]
    .filter(Boolean)
    .map((value) => foldSearch(String(value)))
  if (haystacks.some((hay) => containsQuery(hay, q))) return true
  const tokens = q.split(' ').filter(Boolean)
  return tokens.length > 1 && haystacks.some((hay) => tokens.every((token) => containsQuery(hay, token)))
}
