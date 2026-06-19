import { redirect } from 'next/navigation'

export default function SemanalPage() {
  redirect('/calendario?view=week')
}
