'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, ReactNode } from 'react'

export default function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
    return () => cancelAnimationFrame(t)
  }, [pathname])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.22s ease',
      minHeight: '100vh',
    }}>
      {children}
    </div>
  )
}