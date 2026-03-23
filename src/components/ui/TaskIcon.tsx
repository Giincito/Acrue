import { icons } from 'lucide-react'

interface TaskIconProps {
  icon?: string | null
  size?: number
  className?: string
}

export function TaskIcon({ icon, size = 14, className }: TaskIconProps) {
  // Slot fijo siempre — con o sin ícono
  if (!icon) {
    return <span style={{ width: size, height: size, display: 'inline-block', flexShrink: 0 }} />
  }

  // Convertir kebab-case a PascalCase para Lucide
  const iconName = icon
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('') as keyof typeof icons

  const LucideIcon = icons[iconName]
  if (!LucideIcon) return <span style={{ width: size, height: size, display: 'inline-block', flexShrink: 0 }} />

  return (
    <LucideIcon
      size={size}
      strokeWidth={1.5}
      className={className}
      style={{ flexShrink: 0, color: 'inherit', opacity: 0.6 }}
    />
  )
}
