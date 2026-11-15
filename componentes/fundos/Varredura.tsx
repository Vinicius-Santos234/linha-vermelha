'use client'

import { acaso, MONO, usarTela, type Desenho } from './usarTela'

// O fundo do Ataque: um despejo de bytes em hexadecimal, com a linha de um scanner
// descendo e acendendo o que encontra. Alguns bytes "vazam" em vermelho quando ela passa.
// Depois da vitória, uma linha vermelha fica acesa atravessando a tela: a linha foi cruzada.
const ALTURA = 19
const RASTRO = 190
const HEX = '0123456789abcdef'
const byte = (c: number, l: number) => {
  const n = acaso(c, l) & 0xff
  return HEX[n >> 4]! + HEX[n & 15]!
}

const desenhar: Desenho<{ cruzou: boolean }> = (ctx, largura, altura, t, { cruzou }) => {
  ctx.font = `12px ${MONO}`
  ctx.textBaseline = 'top'
  const passo = ctx.measureText('00 ').width || 22
  const colunas = Math.ceil(largura / passo) + 1
  const linhas = Math.ceil(altura / ALTURA) + 1
  const scanner = ((t * 64) % (altura + RASTRO * 2)) - RASTRO

  for (let l = 0; l < linhas; l++) {
    const y = l * ALTURA
    // Quanto a linha do scanner já passou por aqui. O rastro esfria aos poucos.
    const atras = scanner - y
    const calor = atras >= 0 && atras < RASTRO ? 1 - atras / RASTRO : 0
    let texto = ''
    for (let c = 0; c < colunas; c++) texto += `${byte(c, l)} `
    ctx.fillStyle = `rgba(255, 165, 105, ${0.085 + calor * 0.22})`
    ctx.fillText(texto, 0, y)
    if (calor > 0) {
      ctx.fillStyle = `rgba(245, 80, 62, ${calor * 0.7})`
      for (let c = 0; c < colunas; c++) if (acaso(c, l, 7) % 43 === 0) ctx.fillText(byte(c, l), c * passo, y)
    }
  }

  // A linha do scanner.
  const feixe = ctx.createLinearGradient(0, 0, largura, 0)
  feixe.addColorStop(0, 'rgba(255, 138, 31, 0)')
  feixe.addColorStop(0.5, 'rgba(255, 150, 60, 0.55)')
  feixe.addColorStop(1, 'rgba(255, 138, 31, 0)')
  ctx.fillStyle = feixe
  ctx.fillRect(0, scanner, largura, 2)

  if (cruzou) {
    const y = Math.round(altura * 0.5)
    ctx.shadowColor = 'rgba(234, 67, 53, 0.95)'
    ctx.shadowBlur = 26 + Math.sin(t * 2.2) * 8
    ctx.fillStyle = 'rgba(234, 67, 53, 0.9)'
    ctx.fillRect(0, y, largura, 3)
  }
}

export function Varredura({ cruzou }: { cruzou: boolean }) {
  const ref = usarTela(desenhar, { cruzou })
  return <canvas ref={ref} className="fundo fundo-varredura" data-cruzou={cruzou} aria-hidden />
}
