'use client'

import { usarTela, type Desenho } from './usarTela'

// O fundo do Laboratório: a tela de um osciloscópio. Uma grade de medição e um traço de
// sinal por usuário do experimento, correndo devagar. É a bancada onde se observa.
const DIVISAO = 64
const CORES = ['rgba(110, 205, 255, 0.34)', 'rgba(255, 165, 95, 0.26)', 'rgba(232, 112, 138, 0.24)', 'rgba(160, 120, 224, 0.26)', 'rgba(129, 201, 149, 0.24)']

const desenhar: Desenho<{ sinais: number }> = (ctx, largura, altura, t, { sinais }) => {
  // A grade, pontilhada, com os dois eixos do meio marcados.
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(150, 190, 220, 0.11)'
  ctx.setLineDash([1, 7])
  ctx.beginPath()
  for (let x = (largura / 2) % DIVISAO; x < largura; x += DIVISAO) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, altura)
  }
  for (let y = (altura / 2) % DIVISAO; y < altura; y += DIVISAO) {
    ctx.moveTo(0, y)
    ctx.lineTo(largura, y)
  }
  ctx.stroke()
  ctx.setLineDash([])
  ctx.strokeStyle = 'rgba(150, 190, 220, 0.16)'
  ctx.beginPath()
  for (let x = (largura / 2) % (DIVISAO / 4); x < largura; x += DIVISAO / 4) {
    ctx.moveTo(x, altura / 2 - 3)
    ctx.lineTo(x, altura / 2 + 3)
  }
  for (let y = (altura / 2) % (DIVISAO / 4); y < altura; y += DIVISAO / 4) {
    ctx.moveTo(largura / 2 - 3, y)
    ctx.lineTo(largura / 2 + 3, y)
  }
  ctx.stroke()

  // Os sinais: cada um com a sua frequência, espalhados na altura da tela.
  const quantos = Math.max(1, Math.min(sinais, CORES.length))
  const feixe = (t * 150) % (largura + 200)
  for (let k = 0; k < quantos; k++) {
    const base = (altura * (k + 1)) / (quantos + 1)
    const amplitude = Math.min(70, altura / (quantos + 1) / 2.6)
    const valor = (x: number) => base + Math.sin(x * (0.011 + k * 0.004) + t * (0.9 + k * 0.25) + k * 2) * amplitude * (0.55 + 0.45 * Math.sin(x * 0.0031 - t * 0.3 + k))
    ctx.strokeStyle = CORES[k]!
    ctx.lineWidth = 1.6
    ctx.shadowColor = CORES[k]!
    ctx.shadowBlur = 10
    ctx.beginPath()
    for (let x = 0; x <= largura; x += 6) (x ? ctx.lineTo : ctx.moveTo).call(ctx, x, valor(x))
    ctx.stroke()
    // O ponto do feixe, varrendo da esquerda para a direita.
    ctx.fillStyle = CORES[k]!.replace(/[\d.]+\)$/, '0.95)')
    ctx.beginPath()
    ctx.arc(feixe, valor(feixe), 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function Osciloscopio({ sinais }: { sinais: number }) {
  const ref = usarTela(desenhar, { sinais }, 20)
  return <canvas ref={ref} className="fundo fundo-osciloscopio" data-sinais={sinais} aria-hidden />
}
