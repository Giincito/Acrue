import { Suspense } from "react"
import { WishlistView } from "@/components/wishlist/wishlist-view"

function ModuleFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Cargando wishlist...
    </div>
  )
}

export default function WishlistPage() {
  return (
    <Suspense fallback={<ModuleFallback />}>
      <WishlistView />
    </Suspense>
  )
}
