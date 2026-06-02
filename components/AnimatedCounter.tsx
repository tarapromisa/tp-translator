'use client'

import { useEffect, useState } from 'react'

type Props = {
  value: number
}

export default function AnimatedCounter({
  value
}: Props) {

  const [count, setCount] = useState(0)

  useEffect(() => {

    let start = 0

    const duration = 1400

    const increment =
      value / (duration / 16)

    const timer = setInterval(() => {

      start += increment

      if (start >= value) {

        setCount(value)

        clearInterval(timer)

      } else {

        setCount(Math.floor(start))

      }

    }, 16)

    return () => clearInterval(timer)

  }, [value])

  return (

    <span>

      {count}

    </span>

  )
}