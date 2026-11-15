import { Navegacao, Texto } from '../../componentes/Pecas'
import { ajuda } from '../../jogo/fases.gerado'
import { t } from '../../jogo/t'

export default function Pagina() {
  return (
    <>
      <Navegacao atual="ajuda" />
      <main className="inicio documento">
        <h1>
          <span className="gradiente">{t('ajuda.titulo')}</span>
        </h1>
        <p className="abertura">{t('ajuda.abertura')}</p>
        <Texto markdown={ajuda} />
      </main>
    </>
  )
}
