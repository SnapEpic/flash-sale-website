import PageHeader from '../components/PageHeader'
import CategoryCard from '../components/CategoryCard'
import Reveal from '../components/Reveal'
import Button from '../components/Button'
import { useStore } from '../context/StoreContext'

export default function Categories() {
  const { categories: CATEGORIES, products: PRODUCTS } = useStore()
  return (
    <>
      <PageHeader title="Categories" subtitle={`${PRODUCTS.length} products across ${CATEGORIES.length} categories. Pick a world and browse what’s live.`} crumbs={[['Categories']]} />
      <section className="container-x pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 3) * 0.06}>
              <CategoryCard category={c} className={i % 5 === 0 ? 'aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3]' : 'aspect-[4/3]'} />
            </Reveal>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center gap-4 rounded-3xl bg-bone p-10 text-center">
          <p className="h-display text-4xl sm:text-5xl">Can&rsquo;t decide?</p>
          <p className="max-w-md text-stone">See every live deal in one place, sorted by how fast it&rsquo;s selling.</p>
          <Button to="/flash-sale" variant="dark">Shop the whole sale</Button>
        </div>
      </section>
    </>
  )
}
