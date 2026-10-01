import { Heart } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductGrid from '../components/ProductGrid'
import EmptyState from '../components/EmptyState'
import { useStore } from '../context/StoreContext'

export default function Wishlist() {
  const { products, wishlist } = useStore()
  const list = products.filter((p) => wishlist.includes(p.id))
  return (
    <>
      <PageHeader title="Wishlist" subtitle={list.length ? `${list.length} saved. Stock changes fast, so don’t wait too long.` : undefined} crumbs={[['Wishlist']]} />
      <section className="container-x pb-24">
        {list.length ? <ProductGrid products={list} /> : (
          <EmptyState icon={Heart} title="Nothing saved yet" text="Tap the heart on any product and it will wait for you here, even after you refresh." cta="Browse the flash sale" to="/flash-sale" />
        )}
      </section>
    </>
  )
}
