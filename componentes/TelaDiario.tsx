'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { hoje } from '../desafio/gerar'
import { faseDaTela, rotaDe } from '../jogo/fases'
import { aoMudarProgresso, lerProgresso, sequencia, type Modo, type Progresso } from '../jogo/progresso'
import { t, type Chave } from '../jogo/t'
import { Estrelas, Navegacao, Texto } from './Pecas'
import { TelaAtaque } from './TelaAtaque'
import { TelaCiclo } from './TelaCiclo'
import { TelaDefesa } from './TelaDefesa'

const MODOS: { modo: Modo; rotulo: Chave; borda: string }[] = [
  { modo: 'ataque', rotulo: 'inicio.atacar', borda: 'borda-quente' },
  { modo: 'defesa', rotulo: 'inicio.defender', borda: 'borda-fria' },
  { modo: 'ciclo', rotulo: 'inicio.ciclo', borda: 'borda-completa' },
]

/** O desafio do dia: uma fase gerada a partir da data, igual para todo mundo. */
export function TelaDiario() {
  const modo = useSearchParams().get('modo')
  // A data é a do relógio de quem joga, então só existe depois que a página monta.
  const [data, setData] = useState<string | null>(null)
  const [progresso, setProgresso] = useState<Progresso>({})
  useEffect(() => {
    setData(hoje())
    setProgresso(lerProgresso())
    return aoMudarProgresso(setProgresso)
  }, [])

  if (!data) return <Navegacao atual="diario" />
  const id = `diario-${data}`
  if (modo === 'ataque') return <TelaAtaque key="ataque" id={id} />
  if (modo === 'defesa') return <TelaDefesa key="defesa" id={id} />
  if (modo === 'ciclo') return <TelaCiclo key="ciclo" id={id} />

  const fase = faseDaTela(id)
  const dias = sequencia(progresso, data)
  const feito = Object.keys(progresso[id] ?? {}).length > 0
  return (
    <>
      <Navegacao atual="diario" />
      <main className="inicio">
        <span className="pilula borda-completa">{t('diario.rotulo')}</span>
        <h1 style={{ marginTop: 18 }}>
          <span className="gradiente">{fase.rotulo}</span>
        </h1>
        <p className="abertura">{t('diario.texto')}</p>
        <p className="sequencia">
          <b>{t('diario.sequencia', { n: dias })}</b>
          <span className="fraco">{feito ? t('diario.feitoHoje') : dias > 0 ? t('diario.naoPerca') : t('diario.comece')}</span>
        </p>

        <section className="cartao borda-completa" style={{ marginTop: 26 }}>
          <h2>{t('briefing.titulo')}</h2>
          <Texto markdown={fase.texto.briefingDoAtaque} />
          <div className="acoes-diario">
            {MODOS.map(({ modo, rotulo, borda }) => (
              <div className="acao" key={modo}>
                <Estrelas quantas={progresso[id]?.[modo]?.estrelas ?? 0} rotulo={t(rotulo)} />
                <Link className={`botao ${borda}`} href={rotaDe(id, modo)}>
                  {t(rotulo)}
                </Link>
              </div>
            ))}
          </div>
        </section>
        <p className="fraco pequeno" style={{ marginTop: 16 }}>
          {t('diario.troca')}
        </p>
      </main>
    </>
  )
}
