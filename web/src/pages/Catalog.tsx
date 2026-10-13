import { useState } from 'react'
import { Link } from 'react-router'
import { useEquipmentList } from '../api/hooks'
import { EQUIPMENT_TYPE_LABEL, type Equipment, type EquipmentType } from '../api/types'
import { Alert, Card, Loading, PageTitle } from '../components/ui'

export function Specs({ equipment }: { equipment: Equipment }) {
  const specs = [
    equipment.aperture_mm && `${equipment.aperture_mm} mm de apertura`,
    equipment.focal_length_mm && `${equipment.focal_length_mm} mm de focal`,
    equipment.aperture_mm && equipment.focal_length_mm && `f/${(equipment.focal_length_mm / equipment.aperture_mm).toFixed(1)}`,
  ].filter(Boolean)
  if (!specs.length) return null
  return <p className="font-mono text-xs text-muted">{specs.join(' · ')}</p>
}

export default function Catalog() {
  const [type, setType] = useState<EquipmentType | ''>('')
  const { data, isPending, error } = useEquipmentList({ type })

  return (
    <>
      <PageTitle eyebrow="Equipo del club" title="¿Qué vas a observar esta noche?">
        Elige un telescopio o cualquier otro equipo, mira cuándo está libre y resérvalo en un par de clics. Sin hojas de cálculo ni
        reservas pisadas.
      </PageTitle>

      <div role="group" aria-label="Filtrar por tipo" className="mb-6 flex flex-wrap gap-2">
        {(['', ...Object.keys(EQUIPMENT_TYPE_LABEL)] as (EquipmentType | '')[]).map((t) => (
          <button
            key={t || 'all'}
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
              type === t ? 'border-accent bg-accent text-accent-ink' : 'border-line text-muted hover:text-ink'
            }`}
          >
            {t ? EQUIPMENT_TYPE_LABEL[t] : 'Todo'}
          </button>
        ))}
      </div>

      {isPending && <Loading />}
      {error && <Alert>No se ha podido cargar el catálogo. {error.message}</Alert>}
      {data?.length === 0 && <p className="text-muted">No hay equipos de este tipo.</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((e) => (
          <li key={e.id}>
            <Link to={`/equipos/${e.id}`} className="group block h-full">
              <Card className="flex h-full flex-col gap-3 transition group-hover:-translate-y-0.5 group-hover:border-accent">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">{EQUIPMENT_TYPE_LABEL[e.type]}</p>
                <h2 className="font-display text-xl font-bold">{e.name}</h2>
                <Specs equipment={e} />
                {e.description && <p className="text-sm text-muted">{e.description}</p>}
                <span className="mt-auto pt-2 text-sm font-semibold text-accent">Ver disponibilidad →</span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
