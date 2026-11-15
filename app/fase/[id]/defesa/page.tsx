import { TelaDefesa } from '../../../../componentes/TelaDefesa'
import { fases } from '../../../../jogo/fases'

export function generateStaticParams() {
  return fases.map((fase) => ({ id: fase.id }))
}

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TelaDefesa id={id} />
}
