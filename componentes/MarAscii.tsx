'use client'

import { useEffect, useRef } from 'react'

// O mar do jogo: ondas de caracteres passando devagar, num canvas escuro. É fundo, então
// fica bem apagado, e para quando a aba some ou quando a pessoa pediu menos movimento.
const FONTE = "13px ui-monospace, 'Cascadia Code', Consolas, 'Liberation Mono', monospace"
const ALTURA_DA_LINHA = 17
const CORES = ['rgba(150, 170, 200, 0.10)', 'rgba(120, 160, 225, 0.17)', 'rgba(110, 170, 255, 0.27)']

/** Um número estável para uma célula num instante: decide onde boiam os zeros e uns. */
const acaso = (x: number, y: number, tempo: number) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(tempo, 83492791)) >>> 0

export function MarAscii({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const tela = ref.current
    const ctx = tela?.getContext('2d')
    if (!tela || !ctx) return
    const parado = matchMedia('(prefers-reduced-motion: reduce)').matches
    let largura = 0
    let altura = 0
    let colunas = 0
    let linhas = 0
    let passo = 8

    const medir = () => {
      const escala = Math.min(window.devicePixelRatio || 1, 2)
      const caixa = tela.getBoundingClientRect()
      largura = caixa.width
      altura = caixa.height
      tela.width = Math.max(1, Math.round(largura * escala))
      tela.height = Math.max(1, Math.round(altura * escala))
      ctx.setTransform(escala, 0, 0, escala, 0, 0)
      ctx.font = FONTE
      ctx.textBaseline = 'top'
      passo = ctx.measureText('M').width || 8
      colunas = Math.ceil(largura / passo) + 1
      linhas = Math.ceil(altura / ALTURA_DA_LINHA) + 1
    }

    const desenhar = (t: number) => {
      ctx.clearRect(0, 0, largura, altura)
      // Três tons. Cada linha vira três textos, um por tom, com espaço onde o tom não aparece.
      const tons: string[][] = [[], [], []]
      for (let y = 0; y < linhas; y++) {
        const texto = ['', '', '']
        for (let x = 0; x < colunas; x++) {
          // As cristas são faixas inclinadas que serpenteiam: a fase de cada linha balança
          // com o tempo, e uma segunda onda, mais larga, abre clareiras de água parada.
          const crista = Math.sin(x * 0.21 + Math.sin(y * 0.34 + t * 0.35) * 2.6 + y * 0.55 - t * 1.05)
          const mare = Math.sin(x * 0.045 - y * 0.09 + t * 0.22) * 0.5 + Math.sin(y * 0.17 + t * 0.15) * 0.3
          const onda = crista + mare
          let letra = ' '
          let tom = 0
          if (onda > 1.25) [letra, tom] = ['~', 2]
          else if (onda > 0.95) [letra, tom] = ['~', 1]
          else if (onda > 0.7) [letra, tom] = [(x + y) % 3 ? '-' : '=', 1]
          else if (onda > 0.45) [letra, tom] = [(x * 7 + y * 3) % 4 ? '.' : ':', 0]
          else if (onda < -1.35) [letra, tom] = ["'", 0]
          // De vez em quando, um bit à deriva.
          const sorte = acaso(x, y, Math.floor(t * 0.5 + x * 0.03))
          if (sorte % 257 === 0) [letra, tom] = [sorte % 2 ? '1' : '0', 2]
          for (let i = 0; i < 3; i++) texto[i] += i === tom ? letra : ' '
        }
        for (let i = 0; i < 3; i++) tons[i]!.push(texto[i]!)
      }
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = CORES[i]!
        for (let y = 0; y < linhas; y++) ctx.fillText(tons[i]![y]!, 0, y * ALTURA_DA_LINHA)
      }
    }

    medir()
    desenhar(0)
    const observador = new ResizeObserver(() => {
      medir()
      desenhar(performance.now() / 1000)
    })
    observador.observe(tela)
    const relogio = parado ? null : setInterval(() => !document.hidden && desenhar(performance.now() / 1000), 95)
    return () => {
      observador.disconnect()
      if (relogio) clearInterval(relogio)
    }
  }, [])

  return <canvas ref={ref} className={`mar${className ? ` ${className}` : ''}`} aria-hidden />
}
