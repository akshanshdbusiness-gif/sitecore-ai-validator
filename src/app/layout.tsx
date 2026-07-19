import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { Footer } from '@/src/components/Footer'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })

export const metadata: Metadata = {
  title: 'SitecoreAI Validator',
  description:
    'SitecoreAI Validator ensures content quality, compliance and accuracy, helping teams validate, assure and publish with confidence.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        {children}
        <Footer />
      </body>
    </html>
  )
}
