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

export function matchesSearch(entity: { name: string; nameEn?: string }, needle: string) {
  const q = needle.trim().toLowerCase()
  if (!q) return true
  return entity.name.toLowerCase().includes(q) || Boolean(entity.nameEn?.toLowerCase().includes(q))
}
