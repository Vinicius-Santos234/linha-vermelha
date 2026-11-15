'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { fases, fasesAbertas, TOTAL_DO_CATALOGO } from '../jogo/fases'
import { aoMudarProgresso, lerProgresso, type Progresso } from '../jogo/progresso'
import { t, type Chave } from '../jogo/t'
import { ARTES, BUSSOLA, TESOURO } from './ArteDasIlhas'
import { CartaoDaFase } from './CartaoDaFase'
import { MarAscii } from './MarAscii'

type Ponto = [number, number]

// Onde fica cada ilha. No computador a rota serpenteia em três fileiras; no celular,
// desce em zigue-zague. O último ponto é o tesouro.
const LARGO = {
  largura: 1200,
  altura: 880,
  ilha: 15,
  pontos: [
    [150, 160], [420, 115], [690, 175], [960, 130],
    [1045, 410], [790, 445], [525, 400], [255, 455],
    [165, 715], [440, 740], [725, 695], [1015, 725],
  ] as Ponto[],
  bussola: [90, 310] as Ponto,
}
const ESTREITO = {
  largura: 400,
  altura: 2050,
  ilha: 43,
  pontos: Array.from({ length: 12 }, (_, i): Ponto => [i % 2 ? 285 : 115, 120 + i * 162]),
  bussola: [330, 60] as Ponto,
}

/** Uma curva suave que passa por todos os pontos. Devolve um trecho por par de pontos vizinhos. */
function trechos(pontos: Ponto[]): string[] {
  return pontos.slice(0, -1).map((p, i) => {
    const antes = pontos[i - 1] ?? p
    const prox = pontos[i + 1]!
    const depois = pontos[i + 2] ?? prox
    const c1 = [p[0] + (prox[0] - antes[0]) / 6, p[1] + (prox[1] - antes[1]) / 6]
    const c2 = [prox[0] - (depois[0] - p[0]) / 6, prox[1] - (depois[1] - p[1]) / 6]
    return `C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${prox[0]} ${prox[1]}`
  })
}

/** O mapa de fases: ilhas em forma de peça, ligadas pela rota, num mar de caracteres. */
export function Mapa() {
  // O progresso mora no navegador: só existe depois que a página monta.
  const [progresso, setProgresso] = useState<Progresso>({})
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null)
  const [estreito, setEstreito] = useState(false)
  useEffect(() => {
    setProgresso(lerProgresso())
    const tela = matchMedia('(max-width: 760px)')
    const ajustar = () => setEstreito(tela.matches)
    ajustar()
    tela.addEventListener('change', ajustar)
    const parar = aoMudarProgresso(setProgresso)
    return () => {
      tela.removeEventListener('change', ajustar)
      parar()
    }
  }, [])

  const m = estreito ? ESTREITO : LARGO
  const abertas = fasesAbertas(progresso)
  const vencida = (id: string) => Object.keys(progresso[id] ?? {}).length > 0
  // A fase em que o jogador parou: a primeira aberta ainda sem os três modos.
  const parou = abertas.find((f) => Object.keys(progresso[f.id] ?? {}).length < 3) ?? abertas.at(-1)!
  const escolhida = fases.find((f) => f.id === escolhidaId) ?? parou

  const partes = trechos(m.pontos)
  const inicio = `M${m.pontos[0]![0]} ${m.pontos[0]![1]}`
  const ate = fases.indexOf(abertas.at(-1)!)
  const lugar = ([x, y]: Ponto): CSSProperties => ({ left: `${(x / m.largura) * 100}%`, top: `${(y / m.altura) * 100}%`, width: `${m.ilha}%` })

  return (
    <div className="mapa-pagina">
      <MarAscii />
      <div className="mapa-moldura">
        <header className="mapa-titulo">
          <h1>
            <span className="gradiente">{t('fases.titulo')}</span>
          </h1>
          <p>{t('mapa.sub')}</p>
        </header>

        <div className="mapa" style={{ aspectRatio: `${m.largura} / ${m.altura}` }} role="group" aria-label={t('fases.titulo')}>
          <svg className="rota" viewBox={`0 0 ${m.largura} ${m.altura}`} preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="rota-quente" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={m.largura} y2={m.altura}>
                <stop offset="0" stopColor="#ea4335" />
                <stop offset="0.55" stopColor="#ff8a1f" />
                <stop offset="1" stopColor="#fdc830" />
              </linearGradient>
            </defs>
            <path className="rota-apagada" d={`${inicio}${partes.join('')}`} />
            {ate > 0 && <path className="rota-acesa" d={`${inicio}${partes.slice(0, ate).join('')}`} />}
          </svg>

          <div className="mapa-bussola" style={{ left: `${(m.bussola[0] / m.largura) * 100}%`, top: `${(m.bussola[1] / m.altura) * 100}%` }}>
            {BUSSOLA}
          </div>

          {fases.map((fase, i) => {
            const aberta = abertas.includes(fase)
            const estado = vencida(fase.id) ? 'vencida' : aberta ? 'aberta' : 'trancada'
            const estrelas = Object.values(progresso[fase.id] ?? {}).reduce((s, c) => s + (c?.estrelas ?? 0), 0)
            return (
              <button
                key={fase.id}
                className={`ilha ${estado} forma-${i % 4}${fase === escolhida ? ' escolhida' : ''}`}
                style={lugar(m.pontos[i]!)}
                onClick={() => setEscolhidaId(fase.id)}
                aria-pressed={fase === escolhida}
                aria-label={`${fase.rotulo}, ${t(`mapa.peca.${fase.numero}` as Chave)}${aberta ? '' : ` (${t('trilha.trancada')})`}`}
              >
                <span className="terra">{ARTES[i]}</span>
                <span className="bandeira">{String(fase.numero).padStart(2, '0')}</span>
                {estrelas > 0 && <span className="saldo">★ {estrelas}</span>}
                <span className="nome">
                  <b>{fase.texto.titulo}</b>
                </span>
              </button>
            )
          })}

          <div className="ilha tesouro forma-1" style={lugar(m.pontos.at(-1)!)}>
            <span className="terra">{TESOURO}</span>
            <span className="nome">
              <b>{t('mapa.tesouro')}</b>
              <small>{t('mapa.tesouroTexto', { n: TOTAL_DO_CATALOGO - fases.length })}</small>
            </span>
          </div>
        </div>

        <div className="mapa-painel">
          <CartaoDaFase fase={escolhida} aberta={abertas.includes(escolhida)} progresso={progresso} extra={t(`mapa.peca.${escolhida.numero}` as Chave)} />
        </div>
      </div>
    </div>
  )
}
