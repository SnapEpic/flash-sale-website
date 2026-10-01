import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, PackageSearch } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductGrid from '../components/ProductGrid'
import SortSelect from '../components/SortSelect'
import EmptyState from '../components/EmptyState'
import { useStore } from '../context/StoreContext'
import useRemote from '../hooks/useRemote'
import { api } from '../lib/api'
import { sortProducts } from '../lib/filters'

export default function Category() {
  const { category } = useParams()
  const { getCategory } = useStore()
  const cat = getCategory(category)
  const [sort, setSort] = useState('popular')
  const { data, loading, error, reload } = useRemote(() => api.get(`/products/category/${category}`).then((r) => r.data.products), [category], { pollMs: 20000 })
  const list = useMemo(() => sortProducts(data || [], sort), [data, sort])

  if (!cat) {
    return <div className="container-x pt-40 pb-20"><EmptyState icon={PackageSearch} title="Category not found" text="That category doesn’t exist. Try one of ours." cta="Browse categories" to="/categories" /></div>
  }
  return (
    <>
      <PageHeader title={cat.name} subtitle={`${cat.blurb}. ${cat.productCount} ${cat.productCount === 1 ? 'deal' : 'deals'} live now.`} crumbs={[['Categories', '/categories'], [cat.name]]}>
        <SortSelect value={sort} onChange={setSort} />
      </PageHeader>
      <section className="container-x pb-24">
        {loading && !data ? (
          <div className="grid min-h-[30svh] place-items-center" role="status" aria-label="Loading"><span className="h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-signal" /></div>
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Could not load this category" text={error} cta="Try again" onClick={reload} />
        ) : list.length ? (
          <ProductGrid key={`${category}-${sort}`} products={list} />
        ) : (
          <EmptyState icon={PackageSearch} title="Nothing here yet" text="New drops land here regularly. Check back soon." cta="Browse categories" to="/categories" />
        )}
      </section>
    </>
  )
}
