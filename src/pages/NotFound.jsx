import { Compass } from 'lucide-react'
import EmptyState from '../components/EmptyState'

export default function NotFound() {
  return <div className="container-x pb-20 pt-40"><EmptyState icon={Compass} title="Page not found" text="That page has sold out, or it never existed." cta="Back to home" to="/" /></div>
}
