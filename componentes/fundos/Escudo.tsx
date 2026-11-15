'use client'

import { acaso, usarTela, type Desenho } from './usarTela'

// O fundo da Defesa: uma malha de hexágonos, como um escudo. Cada brecha em aberto é um
// hexágono rachado em vermelho; consertar fecha os hexágonos, e com tudo certo a malha
// inteira sela e brilha. O fundo é o estado do conserto.
const LADO = 30
const MAXIMO_DE_BRECHAS = 16

function hexagono(ctx: CanvasRenderingContext2D, x: number, y: number, lado: number) {
  ctx.moveTo(x, y - lado)
  for (let i = 1; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2
    ctx.lineTo(x + Math.cos(a) * lado, y + Math.sin(a) * lado)
  }
  ctx.closePath()
}

const desenhar: Desenho<{ brechas: number; selado: boolean }> = (ctx, largura, altura, t, { brechas, selado }) => {
  const dx = LADO * Math.sqrt(3)
  const dy = LADO * 1.5
  const colunas = Math.ceil(largura / dx) + 2
  const linhas = Math.ceil(altura / dy) + 2
  const centros: { x: number; y: number; ordem: number }[] = []
  for (let l = 0; l < linhas; l++) for (let c = 0; c < colunas; c++) centros.push({ x: c * dx + (l % 2 ? dx / 2 : 0), y: l * dy, ordem: acaso(c, l, 3) })

  // A malha.
  ctx.lineWidth = 1
  ctx.strokeStyle = selado ? 'rgba(150, 175, 255, 0.2)' : 'rgba(130, 155, 235, 0.085)'
  ctx.beginPath()
  for (const h of centros) hexagono(ctx, h.x, h.y, LADO - 1.5)
  ctx.stroke()

  // Um pulso que sai do meio e corre a malha, como um escudo testando a si mesmo.
  const meio = { x: largura / 2, y: altura / 2 }
  const raio = (t * (selado ? 170 : 110)) % (Math.hypot(largura, altura) / 2 + 160)
  ctx.strokeStyle = selado ? 'rgba(170, 195, 255, 0.5)' : 'rgba(150, 130, 235, 0.3)'
  ctx.beginPath()
  for (const h of centros) if (Math.abs(Math.hypot(h.x - meio.x, h.y - meio.y) - raio) < 34) hexagono(ctx, h.x, h.y, LADO - 1.5)
  ctx.stroke()

  // As brechas: sempre os mesmos hexágonos, na parte de baixo da janela, que os cartões
  // costumam deixar livre, para o jogador vê-los fechar.
  const abertas = [...centros]
    .filter((h) => h.x > 40 && h.x < largura - 40 && h.y > altura * 0.5 && h.y < altura - 30)
    .sort((a, b) => a.ordem - b.ordem)
    .slice(0, Math.min(brechas, MAXIMO_DE_BRECHAS))
  for (const h of abertas) {
    const pulso = 0.55 + Math.sin(t * 2.4 + h.ordem) * 0.2
    ctx.fillStyle = `rgba(234, 67, 53, ${0.2 * pulso})`
    ctx.strokeStyle = `rgba(245, 90, 70, ${0.85 * pulso})`
    ctx.lineWidth = 1.6
    ctx.shadowColor = 'rgba(234, 67, 53, 0.8)'
    ctx.shadowBlur = 14
    ctx.beginPath()
    hexagono(ctx, h.x, h.y, LADO - 1.5)
    ctx.fill()
    ctx.stroke()
    // A rachadura.
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.moveTo(h.x - 9, h.y - 13)
    ctx.lineTo(h.x + 2, h.y - 4)
    ctx.lineTo(h.x - 5, h.y + 3)
    ctx.lineTo(h.x + 8, h.y + 14)
    ctx.stroke()
  }
}

export function Escudo({ brechas, selado }: { brechas: number; selado: boolean }) {
  const ref = usarTela(desenhar, { brechas, selado }, 10)
  return <canvas ref={ref} className="fundo fundo-escudo" data-brechas={brechas} data-selado={selado} aria-hidden />
}
