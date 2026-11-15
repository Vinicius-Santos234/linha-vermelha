import Link from 'next/link'
import type { FaseDaTela } from '../jogo/fases'
import type { Modo, Progresso } from '../jogo/progresso'
import { t, type Chave } from '../jogo/t'
import { Estrelas } from './Pecas'

const MODOS: { modo: Modo; rotulo: Chave; borda: string }[] = [
  { modo: 'ataque', rotulo: 'inicio.atacar', borda: 'borda-quente' },
  { modo: 'defesa', rotulo: 'inicio.defender', borda: 'borda-fria' },
  { modo: 'ciclo', rotulo: 'modo.ciclo', borda: 'borda-completa' },
]

/** O cartão da fase escolhida na trilha ou no mapa: o resumo e os três modos, ou o aviso de trancada. */
export function CartaoDaFase({ fase, aberta, progresso, extra }: { fase: FaseDaTela; aberta: boolean; progresso: Progresso; extra?: string }) {
  return (
    <div className={`ponto-cartao${aberta ? '' : ' trancado'}`} aria-live="polite">
      <small>
        {t('inicio.nivel', { n: fase.nivel })} · {t('trilha.fase', { n: fase.numero })}
        {extra ? ` · ${extra}` : ''}
      </small>
      <h3>{fase.texto.titulo}</h3>
      {aberta ? (
        <>
          <p>{fase.texto.resumo}</p>
          <div className="ponto-modos">
            {MODOS.map(({ modo, rotulo, borda }) => (
              <Link key={modo} className={`chip-modo ${borda}`} href={`/fase/${fase.id}/${modo}/`}>
                {t(rotulo)}
                <Estrelas quantas={progresso[fase.id]?.[modo]?.estrelas ?? 0} rotulo={t(rotulo)} />
              </Link>
            ))}
          </div>
        </>
      ) : (
        <p>{t('inicio.trancada')}</p>
      )}
    </div>
  )
}
