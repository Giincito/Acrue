"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type IntentPrefetchLinkProps = React.ComponentProps<typeof Link>

export function IntentPrefetchLink({
  href,
  onFocus,
  onPointerEnter,
  onTouchStart,
  prefetch = false,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter()
  const prefetchedHref = React.useRef<string | null>(null)

  const prefetchOnIntent = React.useCallback(() => {
    if (typeof href !== "string" || prefetchedHref.current === href) return

    prefetchedHref.current = href
    router.prefetch(href)
  }, [href, router])

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onFocus={(event) => {
        prefetchOnIntent()
        onFocus?.(event)
      }}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") prefetchOnIntent()
        onPointerEnter?.(event)
      }}
      onTouchStart={(event) => {
        prefetchOnIntent()
        onTouchStart?.(event)
      }}
      {...props}
    />
  )
}
