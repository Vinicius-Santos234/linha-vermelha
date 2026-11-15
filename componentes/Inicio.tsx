'use client'

import Link from 'next/link'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { fases, fasesAbertas, TOTAL_DO_CATALOGO } from '../jogo/fases'
import { aoMudarProgresso, lerProgresso, patente, totalDeEstrelas, type Modo, type Progresso } from '../jogo/progresso'
import { t, type Chave } from '../jogo/t'
import { Cena } from './Cena'
import { Estrelas } from './Pecas'

const REPOSITORIO = 'https://github.com/Vinicius-Santos234/linha-vermelha'
const NOME = t('marca.nome').split(' ')

const icone = (desenho: ReactNode) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {desenho}
  </svg>
)

const MODOS: { modo: Modo; nome: Chave; curto: Chave; texto: Chave; borda: string; cor: string; icone: ReactNode }[] = [
  {
    modo: 'ataque',
    nome: 'modo.ataque',
    curto: 'inicio.atacar',
    texto: 'inicio.modoAtaque',
    borda: 'borda-quente',
    cor: 'quente',
    icone: icone(
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
      </>,
    ),
  },
  {
    modo: 'defesa',
    nome: 'modo.defesa',
    curto: 'inicio.defender',
    texto: 'inicio.modoDefesa',
    borda: 'borda-fria',
    cor: 'frio',
    icone: icone(
      <>
        <path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6l-8-3Z" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </>,
    ),
  },
  {
    modo: 'ciclo',
    nome: 'inicio.ciclo',
    curto: 'modo.ciclo',
    texto: 'inicio.modoCiclo',
    borda: 'borda-completa',
    cor: '',
    icone: icone(
      <>
        <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" />
        <path d="M4 3.5V8h4.5" />
        <path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" />
        <path d="M20 20.5V16h-4.5" />
      </>,
    ),
  },
]

const CADEADO = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="5" y="11" width="14" height="9.5" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

const FRASCO = icone(
  <>
    <path d="M9 2.5h6M10 2.5v6.2L4.6 18a2.3 2.3 0 0 0 2 3.5h10.8a2.3 2.3 0 0 0 2-3.5L14 8.7V2.5" />
    <path d="M7.5 15h9" />
  </>,
)

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

/** A abertura do jogo: a cena, o botão de jogar, a trilha de fases e os modos. */
export function Inicio() {
  // O progresso mora no navegador: só existe depois que a página monta.
  const [progresso, setProgresso] = useState<Progresso>({})
  useEffect(() => {
    setProgresso(lerProgresso())
    return aoMudarProgresso(setProgresso)
  }, [])

  const estrelas = totalDeEstrelas(progresso)
  const maximo = fases.length * MODOS.length * 3
  const abertas = fasesAbertas(progresso)
  const proximo = ondeContinuar(progresso)

  return (
    <main className="palco">
      <section className="heroi">
        <div>
          <span className="pilula borda-quente">{t('marca.sigla')}</span>
          <h1 className="logo-jogo">
            <span>{NOME[0]}</span> <span className="gradiente quente">{NOME.slice(1).join(' ')}</span>
            <i aria-hidden />
          </h1>
          <p className="lema">
            <b className="gradiente quente">{t('inicio.lema1')}</b> <b className="gradiente frio">{t('inicio.lema2')}</b> <b>{t('inicio.lema3')}</b>
          </p>
          <p className="abertura">{t('inicio.texto')}</p>

          <div className="continuar">
            {proximo ? (
              <Link className="jogar" href={`/fase/${proximo.fase.id}/${proximo.modo}/`}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden>
                  <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
                </svg>
                <span>
                  {estrelas > 0 ? t('inicio.continuar') : t('inicio.comecar')}
                  <small>{t('inicio.continuarEm', { n: proximo.fase.numero, modo: t(proximo.nome) })}</small>
                </span>
              </Link>
            ) : (
              <p className="fraco">{t('inicio.tudoVencido')}</p>
            )}
            <Link className="botao-liso" href="/fases/">
              {t('inicio.verFases')}
            </Link>
          </div>

          <div className="hud" aria-label={t('hud.estrelas', { n: estrelas, total: maximo })}>
            <span className="patente">{t(patente(estrelas, maximo))}</span>
            <div className="barra" aria-hidden>
              <i style={{ width: `${(estrelas / maximo) * 100}%` }} />
            </div>
            <span aria-hidden>
              <b>★ {estrelas}</b> / {maximo}
            </span>
          </div>
        </div>

        <Cena />
      </section>

      <section className="faixa">
        <header>
          <h2>{t('trilha.titulo')}</h2>
          <p className="fraco">{t('trilha.sub')}</p>
        </header>
        {/* A linha acende até o último ponto aberto. Cada ponto fica no começo da sua coluna. */}
        <ol className="trilha" style={{ '--ate': `${((abertas.length - 1) / (fases.length + 1)) * 100}%` } as CSSProperties}>
          {fases.map((fase) => {
            const aberta = abertas.includes(fase)
            const vencida = Object.keys(progresso[fase.id] ?? {}).length > 0
            return (
              <li key={fase.id} className={`ponto${vencida ? ' vencido' : aberta ? ' aberto' : ' trancado'}`}>
                <span className="no" aria-hidden>
                  {aberta ? String(fase.numero).padStart(2, '0') : CADEADO}
                </span>
                <div className="ponto-cartao">
                  <small>{t('inicio.nivel', { n: fase.nivel })}</small>
                  <h3>{fase.texto.titulo}</h3>
                  {aberta ? (
                    <>
                      <p>{fase.texto.resumo}</p>
                      <div className="ponto-modos">
                        {MODOS.map(({ modo, curto, borda }) => (
                          <Link key={modo} className={`chip-modo ${borda}`} href={`/fase/${fase.id}/${modo}/`}>
                            {t(curto)}
                            <Estrelas quantas={progresso[fase.id]?.[modo]?.estrelas ?? 0} rotulo={t(curto)} />
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p>{t('inicio.trancada')}</p>
                  )}
                </div>
              </li>
            )
          })}
          <li className="ponto futuro">
            <span className="no" aria-hidden>
              +{TOTAL_DO_CATALOGO - fases.length}
            </span>
            <div className="ponto-cartao">
              <small>{t('trilha.emBreve')}</small>
              <h3>{t('trilha.aCaminho', { n: TOTAL_DO_CATALOGO - fases.length })}</h3>
              <p>{t('trilha.aCaminhoTexto')}</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="faixa">
        <header>
          <h2>{t('inicio.modos')}</h2>
        </header>
        <div className="modos">
          {MODOS.map(({ modo, nome, texto, borda, cor, icone }) => {
            const fase = proximaNoModo(progresso, modo)
            return (
              <Link key={modo} className={`modo-cartao ${borda}`} href={`/fase/${fase.id}/${modo}/`}>
                <span className={`icone ${cor || 'completo'}`}>{icone}</span>
                <h3 className={`gradiente ${cor}`}>{t(nome)}</h3>
                <p>{t(texto)}</p>
                <small>{t('inicio.continuarEm', { n: fase.numero, modo: fase.texto.titulo })} →</small>
              </Link>
            )
          })}
          <Link className="modo-cartao liso" href="/laboratorio/">
            <span className="icone neutro">{FRASCO}</span>
            <h3>{t('inicio.laboratorio')}</h3>
            <p>{t('inicio.laboratorioTexto')}</p>
            <small>{t('inicio.abrirLaboratorio')} →</small>
          </Link>
        </div>
      </section>

      <footer className="rodape">
        <p className="garantia">{t('inicio.garantia')}</p>
        <a href={REPOSITORIO} target="_blank" rel="noreferrer">
          {t('rodape.codigo')}
        </a>
      </footer>
    </main>
  )
}
