import { Inicio } from '../componentes/Inicio'
import { Navegacao } from '../componentes/Pecas'
import { t } from '../jogo/t'

export default function Pagina() {
  return (
    <>
      <Navegacao />
      <main className="inicio">
        <span className="pilula borda-quente">{t('marca.sigla')}</span>
        <h1>
          <span className="gradiente">{t('inicio.titulo')}</span>
        </h1>
        <p className="abertura">{t('inicio.texto')}</p>
        <p className="garantia">{t('inicio.garantia')}</p>
        <Inicio />
      </main>
    </>
  )
}
