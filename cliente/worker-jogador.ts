// O Worker do jogador (D6). Aqui roda o código que o jogador digitou, e mais nada: não há
// PGlite nem Firebase neste arquivo. A única saída é mandar mensagem para a tela.
import type { RespostaCliente } from '../motor/chamada'
import { emTexto, executarCodigo, type ConsoleDoJogador } from './executar-codigo'
import type { DoWorker, ParaOWorker } from './protocolo'
import { criarSupabase } from './supabase'

const escopo = self as unknown as {
  postMessage(mensagem: DoWorker): void
  onmessage: ((evento: { data: ParaOWorker }) => void) | null
}

const esperando = new Map<number, (resposta: RespostaCliente) => void>()
let proximoId = 1

const supabase = criarSupabase(
  (chamada) =>
    new Promise((resolver) => {
      const id = proximoId++
      esperando.set(id, resolver)
      escopo.postMessage({ tipo: 'chamada', id, chamada })
    }),
)

const falar = (nivel: 'log' | 'info' | 'warn' | 'error') => (...args: unknown[]) =>
  escopo.postMessage({ tipo: 'console', nivel, texto: args.map(emTexto).join(' ') })
const consoleDoJogador: ConsoleDoJogador = { log: falar('log'), info: falar('info'), warn: falar('warn'), error: falar('error') }

escopo.onmessage = ({ data }) => {
  if (data.tipo === 'resposta') {
    esperando.get(data.id)?.(data.resposta)
    esperando.delete(data.id)
    return
  }
  executarCodigo(data.codigo, supabase, consoleDoJogador).then(
    () => escopo.postMessage({ tipo: 'fim', erro: null }),
    (e) => escopo.postMessage({ tipo: 'fim', erro: emTexto(e) }),
  )
}
