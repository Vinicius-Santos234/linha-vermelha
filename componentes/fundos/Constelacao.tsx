'use client'

import { acaso, usarTela, type Desenho } from './usarTela'

// O fundo do Perfil: um céu em que cada fase é uma constelação de nove estrelas, três por
// modo. Cada estrela ganha acende, e as acesas de uma mesma fase se ligam. O progresso do
// jogador é o próprio fundo.
const POR_FASE = 9
const fracao = (a: number, b: number, c: number) => (acaso(a, b, c) % 1000) / 1000

const desenhar: Desenho<{ porFase: number[] }> = (ctx, largura, altura, t, { porFase }) => {
  const colunas = largura > 760 ? 4 : 2
  const linhas = Math.ceil(porFase.length / colunas)
  const celula = { l: largura / colunas, a: Math.max(altura / linhas, 150) }
  const raio = Math.min(celula.l, celula.a) * 0.36

  porFase.forEach((ganhas, f) => {
    const cx = ((f % colunas) + 0.5 + (fracao(f, 1, 1) - 0.5) * 0.3) * celula.l
    const cy = (Math.floor(f / colunas) + 0.5 + (fracao(f, 2, 1) - 0.5) * 0.3) * celula.a
    const estrelas = Array.from({ length: POR_FASE }, (_, i) => {
      const angulo = fracao(f, i, 5) * Math.PI * 2
      const distancia = (0.25 + fracao(f, i, 9) * 0.75) * raio
      return { x: cx + Math.cos(angulo) * distancia, y: cy + Math.sin(angulo) * distancia * 0.8 }
    })

    // O número da fase, bem apagado, no meio da constelação.
    ctx.fillStyle = ganhas ? 'rgba(253, 200, 48, 0.07)' : 'rgba(255, 255, 255, 0.03)'
    ctx.font = "600 58px 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(f + 1).padStart(2, '0'), cx, cy)

    // As linhas ligam as estrelas acesas, na ordem em que foram ganhas.
    if (ganhas > 1) {
      ctx.strokeStyle = 'rgba(253, 200, 48, 0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      estrelas.slice(0, ganhas).forEach((e, i) => (i ? ctx.lineTo(e.x, e.y) : ctx.moveTo(e.x, e.y)))
      ctx.stroke()
    }

    estrelas.forEach((e, i) => {
      if (i < ganhas) {
        const brilho = 0.7 + Math.sin(t * 1.6 + f * 3 + i * 1.7) * 0.3
        ctx.shadowColor = 'rgba(253, 200, 48, 0.9)'
        ctx.shadowBlur = 12
        ctx.fillStyle = `rgba(255, 218, 110, ${brilho})`
        ctx.beginPath()
        ctx.arc(e.x, e.y, 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = 'rgba(170, 185, 210, 0.2)'
        ctx.beginPath()
        ctx.arc(e.x, e.y, 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
    })
  })
}

/** `porFase`: quantas estrelas (de 0 a 9) o jogador tem em cada fase, na ordem da trilha. */
export function Constelacao({ porFase }: { porFase: number[] }) {
  const ref = usarTela(desenhar, { porFase }, 8)
  return <canvas ref={ref} className="fundo fundo-constelacao" data-acesas={porFase.reduce((a, b) => a + b, 0)} aria-hidden />
}
