// O lado da tela: sobe um Worker novo para cada execução, responde as chamadas dele e
// o mata no fim ou quando o tempo acaba. Um laço infinito morre aqui, sem travar a aba.
import { t } from '../mensagens/t'
import type { Chamada, RespostaCliente } from '../motor/chamada'
import type { DoWorker, ParaOWorker } from './protocolo'

export interface OpcoesDeExecucao {
  /** Entrega a chamada ao motor e devolve a resposta. */
  responder(chamada: Chamada): Promise<RespostaCliente>
  aoLogar?(nivel: 'log' | 'info' | 'warn' | 'error', texto: string): void
  /** Tempo total da execução. Padrão: 15 s. */
  tempoLimiteMs?: number
}

export interface ResultadoDaExecucao {
  ok: boolean
  erro: string | null
  estourouTempo: boolean
}

/** O que se usa de um Worker. Cabe o Worker do navegador e um de mentira nos testes. */
type WorkerMinimo = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror'>

export function rodarNoWorker(criarWorker: () => WorkerMinimo, codigo: string, opcoes: OpcoesDeExecucao): Promise<ResultadoDaExecucao> {
  return new Promise((resolver) => {
    const worker = criarWorker()
    let acabou = false
    const encerrar = (resultado: ResultadoDaExecucao) => {
      if (acabou) return
      acabou = true
      clearTimeout(relogio)
      worker.terminate()
      resolver(resultado)
    }
    const limite = opcoes.tempoLimiteMs ?? 15_000
    const relogio = setTimeout(
      () => encerrar({ ok: false, erro: t('execucao.tempoEsgotado', { segundos: limite / 1000 }), estourouTempo: true }),
      limite,
    )

    worker.onerror = (e) => encerrar({ ok: false, erro: e.message ?? t('execucao.erroNoCodigo'), estourouTempo: false })
    const enviar = (mensagem: ParaOWorker) => worker.postMessage(mensagem)
    worker.onmessage = (evento) => {
      const data = evento.data as DoWorker
      if (acabou) return
      if (data.tipo === 'console') return opcoes.aoLogar?.(data.nivel, data.texto)
      if (data.tipo === 'fim') return encerrar({ ok: data.erro === null, erro: data.erro, estourouTempo: false })
      if (data.tipo === 'chamada') {
        const { id } = data
        opcoes.responder(data.chamada).then(
          (resposta) => acabou || enviar({ tipo: 'resposta', id, resposta }),
          (e) => encerrar({ ok: false, erro: t('execucao.falhaDoJogo', { erro: (e as Error).message }), estourouTempo: false }),
        )
      }
    }
    enviar({ tipo: 'rodar', codigo })
  })
}
