import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Strava Coach — AI Running Coach',
  description: 'Your personal AI running coach powered by your Strava data',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
