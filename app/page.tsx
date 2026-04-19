import { redirect } from 'next/navigation'
import { getAuthData } from '@/lib/auth'

export default async function Home() {
  const auth = await getAuthData()
  if (auth) redirect('/dashboard')
  else redirect('/login')
}
