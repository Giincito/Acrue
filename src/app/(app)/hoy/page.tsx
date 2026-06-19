import { redirect } from 'next/navigation'

export default function HoyPage() {
  redirect('/tareas?tab=today')
}
