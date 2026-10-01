import PageHeader from '../components/PageHeader'
import Reveal from '../components/Reveal'
import Button from '../components/Button'
import SmartImage from '../components/SmartImage'
import { useStore } from '../context/StoreContext'

const stats = [['21k+', 'orders shipped'], ['4.8', 'average rating'], ['60%', 'biggest markdown'], ['48h', 'longest any drop runs']]
const values = [
  ['Fewer things, better things', 'Every drop is curated by hand. If we would not wear it, carry it or gift it, it does not go on sale.'],
  ['Real scarcity', 'When a stock bar says 7 left, there are 7 left. We never invent urgency to push a sale.'],
  ['Honest prices', 'The crossed-out price is the price we actually charged in the last 30 days.'],
]

export default function About() {
  const { categories } = useStore()
  return (
    <>
      <PageHeader title="About Dropline" subtitle="A flash-sale store for people who like good things and hate overpaying." crumbs={[['About']]} />
      <section className="container-x grid gap-10 pb-16 lg:grid-cols-2">
        <Reveal><SmartImage src={categories[0]?.image} alt="A pair of sneakers from a recent drop" className="aspect-[4/3] w-full rounded-3xl object-cover" /></Reveal>
        <Reveal delay={0.1} className="flex flex-col justify-center">
          <p className="text-2xl font-medium leading-snug tracking-tight sm:text-3xl">We started Dropline because the best deals were always gone by the time we found them.</p>
          <p className="mt-6 max-w-xl leading-relaxed text-ink/70">So we built a store around the clock. Brands give us a small run at a big discount, we put it live for a short window, and you get first pick. No permanent &ldquo;sale&rdquo; banners, no fake markdowns. Just a countdown and a stock bar you can trust.</p>
        </Reveal>
      </section>
      <section className="on-dark bg-ink py-16 text-bone">
        <dl className="container-x grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map(([n, l]) => (
            <div key={l}><dt className="sr-only">{l}</dt><dd className="font-display text-7xl font-black leading-none">{n}</dd><p className="mt-2 text-bone/60" aria-hidden>{l}</p></div>
          ))}
        </dl>
      </section>
      <section className="container-x grid gap-8 py-20 md:grid-cols-3">
        {values.map(([t, d]) => (
          <Reveal key={t}><h2 className="text-2xl font-bold tracking-tight">{t}</h2><p className="mt-3 leading-relaxed text-ink/70">{d}</p></Reveal>
        ))}
      </section>
      <section className="container-x pb-24 text-center"><Button to="/flash-sale" size="lg">See what&rsquo;s live</Button></section>
    </>
  )
}
