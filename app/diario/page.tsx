import { Suspense } from 'react'
import { TelaDiario } from '../../componentes/TelaDiario'

// O modo vem do endereço (?modo=ataque), que só existe no navegador.
export default function Pagina() {
  return (
    <Suspense>
      <TelaDiario />
    </Suspense>
  )
}
