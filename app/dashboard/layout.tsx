import { redirect } from 'next/navigation'
import DashboardShell from './DashboardShell'
import { hasDashboardSession } from '@/lib/dashboard-auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isAuthed = await hasDashboardSession()

  if (!isAuthed) {
    redirect('/dashboard-access')
  }

  return <DashboardShell>{children}</DashboardShell>
}
