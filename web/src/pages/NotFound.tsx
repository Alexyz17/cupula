import { Link } from 'react-router'
import { PageTitle } from '../components/ui'

export default function NotFound() {
  return (
    <PageTitle eyebrow="Error 404" title="Aquí no hay nada que observar">
      <Link to="/" className="font-semibold text-accent hover:underline">
        Volver al catálogo
      </Link>
    </PageTitle>
  )
}
