'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fases, fasesAbertas } from '../jogo/fases'
import { aoMudarProgresso, lerProgresso, type Modo, type Progresso } from '../jogo/progresso'
import { t, type Chave } from '../jogo/t'
import { Estrelas } from './Pecas'

const MODOS: { modo: Modo; rotulo: Chave; borda: string }[] = [
  { modo: 'ataque', rotulo: 'inicio.atacar', borda: 'borda-quente' },
  { modo: 'defesa', rotulo: 'inicio.defender', borda: 'borda-fria' },
  { modo: 'ciclo', rotulo: 'inicio.ciclo', borda: 'borda-completa' },
]

export function ListaDeFases() {
  // O progresso mora no navegador: só existe depois que a página monta.
  const [progresso, setProgresso] = useState<Progresso>({})
  useEffect(() => {
    setProgresso(lerProgresso())
    return aoMudarProgresso(setProgresso)
  }, [])
  const abertas = fasesAbertas(progresso)

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {fases.map((fase) => {
        const aberta = abertas.includes(fase)
        return (
          <article key={fase.id} className={`fase-cartao ${aberta ? 'borda-completa' : 'trancada'}`}>
            <span className={`numero ${aberta ? 'gradiente' : 'fraco'}`} aria-hidden>
              {String(fase.numero).padStart(2, '0')}
            </span>
            <div>
              <span className="pilula borda-quente">{t('inicio.nivel', { n: fase.nivel })}</span>
              <h3>{fase.texto.titulo}</h3>
              <p className="fraco">{aberta ? fase.texto.resumo : t('inicio.trancada')}</p>
            </div>
            {aberta && (
              <div className="acoes">
                {MODOS.map(({ modo, rotulo, borda }) => (
                  <div className="acao" key={modo}>
                    <Estrelas quantas={progresso[fase.id]?.[modo]?.estrelas ?? 0} rotulo={t(rotulo)} />
                    <Link className={`botao ${borda}`} href={`/fase/${fase.id}/${modo}/`}>
                      {t(rotulo)}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </article>
        )
      })}

      <article className="fase-cartao laboratorio-cartao">
        <span className="numero fraco" aria-hidden>
          ∞
        </span>
        <div>
          <h3>{t('inicio.laboratorio')}</h3>
          <p className="fraco">{t('inicio.laboratorioTexto')}</p>
        </div>
        <div className="acoes">
          <Link className="botao-liso" href="/laboratorio/">
            {t('inicio.abrirLaboratorio')}
          </Link>
        </div>
      </article>
    </div>
  )
}
