export const ICON_SET = [
  { id: 'book', label: 'Libro' },
  { id: 'dumbbell', label: 'Ejercicio' },
  { id: 'shopping-cart', label: 'Compras' },
  { id: 'code', label: 'Código' },
  { id: 'music', label: 'Música' },
  { id: 'briefcase', label: 'Trabajo' },
  { id: 'heart', label: 'Salud' },
  { id: 'home', label: 'Hogar' },
  { id: 'graduation-cap', label: 'Estudio' },
  { id: 'dollar-sign', label: 'Finanzas' },
  { id: 'utensils', label: 'Comida' },
  { id: 'car', label: 'Transporte' },
  { id: 'phone', label: 'Llamada' },
  { id: 'mail', label: 'Email' },
  { id: 'star', label: 'Favorito' },
  { id: 'zap', label: 'Urgente' },
  { id: 'clock', label: 'Tiempo' },
  { id: 'map-pin', label: 'Lugar' },
  { id: 'users', label: 'Personas' },
  { id: 'file-text', label: 'Documento' },
] as const

export type IconId = typeof ICON_SET[number]['id']
