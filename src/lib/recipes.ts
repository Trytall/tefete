import type { Catalog, Item } from './types'

export function recipeParts(item: Item, catalog: Catalog) {
  return item.composition
    .map((id) => catalog.items.find((entry) => entry.id === id))
    .filter((part): part is Item => Boolean(part))
}

export function recipeTitle(item: Item, catalog: Catalog) {
  const parts = recipeParts(item, catalog)
  if (!parts.length) return item.name
  return `${item.name} · ${parts.map((part) => part.name).join(' + ')}`
}
