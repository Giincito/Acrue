import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import WishlistPage from './page'

vi.mock('@/components/wishlist/wishlist-view', () => ({
  WishlistView: () => <section>Wishlist activa</section>,
}))

describe('WishlistPage', () => {
  it('renders the wishlist module instead of a placeholder', () => {
    const html = renderToStaticMarkup(<WishlistPage />)

    expect(html).toContain('Wishlist activa')
  })
})
