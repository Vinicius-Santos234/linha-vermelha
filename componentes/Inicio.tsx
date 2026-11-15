'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fases, fasesAbertas } from '../jogo/fases'
import { aoMudarProgresso, lerProgresso, type Modo, type Progresso } from '../jogo/progresso'
import { t, type Chave } from '../jogo/t'

const MODOS: { modo: Modo; nome: Chave; texto: Chave; borda: string }[] = [
  { modo: 'ataque', nome: 'modo.ataque', texto: 'inicio.modoAtaque', borda: 'borda-quente' },
  { modo: 'defesa', nome: 'modo.defesa', texto: 'inicio.modoDefesa', borda: 'borda-fria' },
  { modo: 'ciclo', nome: 'inicio.ciclo', texto: 'inicio.modoCiclo', borda: 'borda-completa' },
]

/** A primeira fase aberta que ainda não foi vencida neste modo. Se todas foram, a última aberta. */
function proximaNoModo(progresso: Progresso, modo: Modo) {
  const abertas = fasesAbertas(progresso)
  return abertas.find((f) => !progresso[f.id]?.[modo]) ?? abertas.at(-1)!
}

/** Onde o jogador parou: fase por fase, e em cada uma ataque, defesa e ciclo. */
function ondeContinuar(progresso: Progresso) {
  for (const fase of fasesAbertas(progresso)) {
    for (const { modo, nome } of MODOS) if (!progresso[fase.id]?.[modo]) return { fase, modo, nome }
  }
  return null
}

/** "Continuar ou escolher modo": o começo do jogo, sem obrigar a passar pelo mapa. */
export function Inicio() {
  // O progresso mora no navegador: só existe depois que a página monta.
  const [progresso, setProgresso] = useState<Progresso>({})
  useEffect(() => {
    setProgresso(lerProgresso())
    return aoMudarProgresso(setProgresso)
  }, [])

  const jaJogou = fases.some((f) => Object.keys(progresso[f.id] ?? {}).length > 0)
  const proximo = ondeContinuar(progresso)

  return (
    <>
      <div className="continuar">
        {proximo ? (
          <Link className="botao grande borda-completa" href={`/fase/${proximo.fase.id}/${proximo.modo}/`}>
            {jaJogou ? t('inicio.continuar') : t('inicio.comecar')}
            <small>{t('inicio.continuarEm', { n: proximo.fase.numero, modo: t(proximo.nome) })}</small>
          </Link>
        ) : (
          <p className="fraco">{t('inicio.tudoVencido')}</p>
        )}
        <Link className="botao-liso" href="/fases/">
          {t('inicio.verFases')}
        </Link>
      </div>

      <h2>{t('inicio.modos')}</h2>
      <div className="modos">
        {MODOS.map(({ modo, nome, texto, borda }) => {
          const fase = proximaNoModo(progresso, modo)
          return (
            <Link key={modo} className={`modo-cartao ${borda}`} href={`/fase/${fase.id}/${modo}/`}>
              <h3 className={`gradiente ${modo === 'ataque' ? 'quente' : modo === 'defesa' ? 'frio' : ''}`}>{t(nome)}</h3>
              <p>{t(texto)}</p>
              <small>{t('inicio.continuarEm', { n: fase.numero, modo: fase.texto.titulo })}</small>
            </Link>
          )
        })}
        <Link className="modo-cartao liso" href="/laboratorio/">
          <h3>{t('inicio.laboratorio')}</h3>
          <p>{t('inicio.laboratorioTexto')}</p>
          <small>{t('inicio.abrirLaboratorio')}</small>
        </Link>
      </div>
    </>
  )
}
