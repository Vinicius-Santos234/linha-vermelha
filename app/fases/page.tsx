import { ListaDeFases } from '../../componentes/ListaDeFases'
import { Navegacao } from '../../componentes/Pecas'
import { t } from '../../jogo/t'

export default function Pagina() {
  return (
    <>
      <Navegacao atual="fases" />
      <main className="inicio">
        <h1>
          <span className="gradiente">{t('fases.titulo')}</span>
        </h1>
        <div style={{ marginTop: 28 }}>
          <ListaDeFases />
        </div>
      </main>
    </>
  )
}
