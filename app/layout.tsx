import type { Metadata } from 'next'
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ro">
      <body className={`${openSans.variable} ${montserrat.variable} ${playfair.variable} antialiased bg-[#fcfbfa]`}>
        <UserProvider>
          <PageTransitionWrapper>
            {/* pt-14 on mobile for the top bar, removed on md+ */}
            <div className="pt-14 md:pt-0">
              {children}
            </div>
          </PageTransitionWrapper>
        </UserProvider>
      </body>
    </html>
  )
}