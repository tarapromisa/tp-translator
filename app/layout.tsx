import type { Metadata, Viewport } from 'next'
import { UserProvider } from '@/context/UserContext'
import PageTransitionWrapper from '@/components/PageTransitionWrapper'
import { Open_Sans, Montserrat, Playfair_Display } from 'next/font/google'
import './globals.css'

const openSans = Open_Sans({ subsets: ['latin'], weight: ['300', '400'], variable: '--font-openSans' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'TP Translator',
  description: 'Premium translation platform'
}

// Necesario para que env(safe-area-inset-*) funcione en iPhone
// y para que el contenido no quede bajo la barra de Safari / home indicator.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro">
      <body className={`${openSans.variable} ${montserrat.variable} ${playfair.variable} antialiased bg-[#fcfbfa] min-h-dvh`}>
        <UserProvider>
          <PageTransitionWrapper>
            {/* pt-16 on mobile = altura de la top bar (h-16) + notch, removed on md+ */}
            <div className="pt-[calc(4rem+env(safe-area-inset-top))] md:pt-0 pb-[env(safe-area-inset-bottom)] md:pb-0">
              {children}
            </div>
          </PageTransitionWrapper>
        </UserProvider>
      </body>
    </html>
  )
}