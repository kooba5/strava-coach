import { redirect } from 'next/navigation'
import { getAuthData } from '@/lib/auth'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const auth = await getAuthData()
  if (!auth) redirect('/login')

  return (
    <DashboardClient
      athleteName={auth.athleteName}
      athleteAvatar={auth.athleteAvatar}
    />
  )
}
