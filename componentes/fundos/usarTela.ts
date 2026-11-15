import { useEffect, useRef, type RefObject } from 'react'

export type Desenho<P> = (ctx: CanvasRenderingContext2D, largura: number, altura: number, tempo: number, props: P) => void

/**
 * A parte comum a todo fundo animado: um canvas do tamanho da caixa, redesenhado algumas
 * vezes por segundo. Para quando a aba some, e vira um quadro só para quem pediu menos
 * movimento. As props mais novas chegam ao desenho sem recriar nada.
 */
export function usarTela<P>(desenhar: Desenho<P>, props: P, quadrosPorSegundo = 12): RefObject<HTMLCanvasElement | null> {
  const ref = useRef<HTMLCanvasElement>(null)
  const atual = useRef({ desenhar, props })
  atual.current = { desenhar, props }
  const redesenhar = useRef<() => void>(() => {})

  useEffect(() => {
    const tela = ref.current
    const ctx = tela?.getContext('2d')
    if (!tela || !ctx) return
    const parado = matchMedia('(prefers-reduced-motion: reduce)').matches
    let largura = 0
    let altura = 0

    const medir = () => {
      const escala = Math.min(window.devicePixelRatio || 1, 1.5)
      const caixa = tela.getBoundingClientRect()
      largura = caixa.width
      altura = caixa.height
      tela.width = Math.max(1, Math.round(largura * escala))
      tela.height = Math.max(1, Math.round(altura * escala))
      ctx.setTransform(escala, 0, 0, escala, 0, 0)
    }
    const quadro = () => {
      ctx.clearRect(0, 0, largura, altura)
      ctx.save()
      atual.current.desenhar(ctx, largura, altura, parado ? 4 : performance.now() / 1000, atual.current.props)
      ctx.restore()
    }
    redesenhar.current = quadro

    medir()
    quadro()
    const observador = new ResizeObserver(() => {
      medir()
      quadro()
    })
    observador.observe(tela)
    const relogio = parado ? null : setInterval(() => !document.hidden && quadro(), 1000 / quadrosPorSegundo)
    return () => {
      observador.disconnect()
      if (relogio) clearInterval(relogio)
    }
  }, [quadrosPorSegundo])

  // Sem movimento, o quadro só muda quando as props mudam.
  useEffect(() => redesenhar.current())

  return ref
}

/** Um número estável para uma posição: decide o que aparece em cada célula. */
export const acaso = (a: number, b: number, c = 0) => (Math.imul(a + 1, 73856093) ^ Math.imul(b + 1, 19349663) ^ Math.imul(c + 1, 83492791)) >>> 0

export const MONO = "ui-monospace, 'Cascadia Code', Consolas, 'Liberation Mono', monospace"
