import { Mapa } from '../../componentes/Mapa'
import { Navegacao } from '../../componentes/Pecas'

export default function Pagina() {
  return (
    <>
      <Navegacao atual="fases" />
      <main>
        <Mapa />
      </main>
    </>
  )
}
