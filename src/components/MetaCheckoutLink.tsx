'use client'

import type { MouseEvent, ReactNode } from 'react'
import { fbq } from './MetaPixel'

type MetaCheckoutLinkProps = {
  href: string
  planId: string
  value: number
  className?: string
  children: ReactNode
}

export default function MetaCheckoutLink({ href, planId, value, className, children }: MetaCheckoutLinkProps) {
  function handleClick() {
    const eventId = `checkout:${planId}:${Date.now()}`

    try {
      window.sessionStorage.setItem(
        'meta_last_checkout',
        JSON.stringify({ eventId, planId, value, ts: Date.now() })
      )
    } catch {}

    fbq(
      'track',
      'InitiateCheckout',
      {
        value,
        currency: 'BRL',
        content_ids: [planId],
        content_type: 'product',
      },
      { eventID: eventId }
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (!event.defaultPrevented) handleClick()
      }}
      className={className}
    >
      {children}
    </a>
  )
}
