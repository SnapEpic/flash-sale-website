import Hero from '../components/home/Hero'
import Ticker from '../components/home/Ticker'
import FlashSaleSection from '../components/FlashSaleSection'
import CategoriesSection from '../components/home/CategoriesSection'
import FeaturedDeal from '../components/home/FeaturedDeal'
import Trending from '../components/home/Trending'
import LimitedStock from '../components/home/LimitedStock'
import BrandShowcase from '../components/home/BrandShowcase'
import Testimonials from '../components/home/Testimonials'
import Newsletter from '../components/home/Newsletter'
import { Package } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import { useStore } from '../context/StoreContext'

export default function Home() {
  const { products } = useStore()
  const flash = products.filter((p) => p.isFlashSale).sort((a, b) => b.discount - a.discount).slice(0, 8)
  if (!products.length) {
    return <div className="container-x pb-20 pt-40"><EmptyState icon={Package} title="No products yet" text="The catalogue is empty. Run the seed script on the server to load the demo products." cta="Contact us" to="/contact" /></div>
  }
  return (
    <>
      <Hero />
      <Ticker />
      <FlashSaleSection products={flash} />
      <CategoriesSection />
      <FeaturedDeal />
      <Trending />
      <LimitedStock />
      <BrandShowcase />
      <Testimonials />
      <Newsletter />
    </>
  )
}
