import Link from 'next/link'
import { MarAscii } from '../componentes/MarAscii'
import { Navegacao } from '../componentes/Pecas'
import { t } from '../jogo/t'

// Fora do mapa só tem mar.
export default function NaoAchei() {
  return (
    <>
      <Navegacao />
      <main className="fora-do-mapa">
        <MarAscii />
        <p className="coordenada" aria-hidden>
          404
        </p>
        <h1>
          <span className="gradiente">{t('perdido.titulo')}</span>
        </h1>
        <p>{t('perdido.texto')}</p>
        <Link className="botao borda-completa" href="/fases/">
          {t('perdido.voltar')}
        </Link>
      </main>
    </>
  )
}
