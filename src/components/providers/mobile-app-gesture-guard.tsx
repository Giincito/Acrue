"use client"

import * as React from "react"

const SELECTABLE_TARGET_SELECTOR = [
  "input",
  "textarea",
  "select",
  '[contenteditable="true"]',
  '[data-text-selectable="true"]',
].join(", ")

function isSelectableTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(SELECTABLE_TARGET_SELECTOR))
}

export function MobileAppGestureGuard() {
  React.useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return

    const preventContextMenu = (event: MouseEvent) => {
      if (isSelectableTarget(event.target)) return

      event.preventDefault()
    }
    const preventGestureZoom = (event: Event) => {
      event.preventDefault()
    }

    document.addEventListener("contextmenu", preventContextMenu, { capture: true })
    document.addEventListener("gesturestart", preventGestureZoom, { passive: false })
    document.addEventListener("gesturechange", preventGestureZoom, { passive: false })
    document.addEventListener("gestureend", preventGestureZoom, { passive: false })

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu, { capture: true })
      document.removeEventListener("gesturestart", preventGestureZoom)
      document.removeEventListener("gesturechange", preventGestureZoom)
      document.removeEventListener("gestureend", preventGestureZoom)
    }
  }, [])

  return null
}
