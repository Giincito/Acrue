/**
 * Category icon mapping and utilities.
 * Maps category names to Lucide icon names for consistent UI rendering.
 * @module lib/finanzas/categories
 */

/** Map of default category names to Lucide icon identifiers */
export const CATEGORY_ICONS: Record<string, string> = {
  'Supermercado': 'shopping-cart',
  'Transporte': 'bus',
  'Servicios': 'zap',
  'Salud': 'heart-pulse',
  'Educación': 'graduation-cap',
  'Entretenimiento': 'gamepad-2',
  'Restaurantes': 'utensils',
  'Ropa': 'shirt',
  'Tecnología': 'smartphone',
  'Hogar': 'home',
  'Otros': 'more-horizontal',
  'Sin categoría': 'help-circle',
} as const

/**
 * Resolves a Lucide icon name for a given category.
 * Falls back to 'tag' for unknown categories.
 */
export function getCategoryIcon(categoryName: string): string {
  return CATEGORY_ICONS[categoryName] ?? 'tag'
}

/** Keywords that map to default categories, used by AI categorization */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Supermercado': ['súper', 'supermercado', 'coto', 'dia', 'carrefour', 'jumbo', 'vea', 'changomas', 'walmart', 'verdulería', 'almacén'],
  'Transporte': ['uber', 'taxi', 'bondi', 'sube', 'nafta', 'combustible', 'estacionamiento', 'peaje', 'cabify', 'colectivo', 'tren', 'subte'],
  'Servicios': ['luz', 'gas', 'agua', 'internet', 'teléfono', 'celular', 'claro', 'personal', 'movistar', 'edenor', 'edesur', 'metrogas', 'telecentro'],
  'Salud': ['farmacia', 'médico', 'doctor', 'hospital', 'clínica', 'osde', 'swiss', 'remedios', 'medicamento', 'consulta'],
  'Educación': ['libro', 'curso', 'universidad', 'colegio', 'matrícula', 'cuota', 'apunte', 'fotocopia'],
  'Entretenimiento': ['cine', 'netflix', 'spotify', 'juego', 'play', 'steam', 'disney', 'hbo', 'teatro', 'concierto', 'recital'],
  'Restaurantes': ['restaurante', 'bar', 'café', 'pizza', 'hamburguesería', 'rappi', 'pedidosya', 'delivery', 'comida', 'almuerzo', 'cena'],
  'Ropa': ['ropa', 'zapatillas', 'zapatos', 'remera', 'pantalón', 'campera', 'nike', 'adidas', 'zara', 'h&m'],
  'Tecnología': ['celular', 'notebook', 'auriculares', 'cargador', 'cable', 'mercadolibre', 'amazon', 'apple'],
  'Hogar': ['mueble', 'decoración', 'limpieza', 'electrodoméstico', 'ferretería', 'Easy', 'Sodimac'],
}

/**
 * Suggests a category name based on expense description keywords.
 * Returns 'Otros' if no match found.
 */
export function suggestCategory(description: string): string {
  const lower = description.toLowerCase()

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        return category
      }
    }
  }

  return 'Otros'
}
