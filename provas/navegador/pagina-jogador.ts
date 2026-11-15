// Página da prova do Worker do jogador. O "motor" aqui é de mentira: responde cada
// chamada com um eco. O que se prova é o Worker, o protocolo e o tempo limite.
import { rodarNoWorker } from '../../cliente/rodar-no-worker'
import type { Chamada } from '../../motor/chamada'

declare global {
  interface Window {
    rodar: (codigo: string, tempoLimiteMs?: number) => Promise<unknown>
  }
}

window.rodar = async (codigo, tempoLimiteMs = 2000) => {
  const chamadas: Chamada[] = []
  const console: string[] = []
  const inicio = performance.now()
  const resultado = await rodarNoWorker(() => new Worker('/provas/.saida/worker-jogador.js'), codigo, {
    tempoLimiteMs,
    aoLogar: (nivel, texto) => console.push(`${nivel}: ${texto}`),
    responder: async (chamada) => {
      chamadas.push(chamada)
      return { data: [{ eco: chamada.tipo === 'from' ? chamada.tabela : chamada.tipo }], error: null }
    },
  })
  return { ...resultado, chamadas, console, ms: Math.round(performance.now() - inicio) }
}
