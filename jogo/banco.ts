// O lado da tela do Worker do banco. O Worker (e com ele o PGlite) só é criado no
// primeiro pedido, ou seja, quando o jogador entra numa fase.
import type { Banco, Pedido, Retorno } from './protocolo-banco'
import { t } from './t'

let worker: Worker | null = null
let proximoId = 1
const esperando = new Map<number, { resolver(valor: unknown): void; rejeitar(erro: Error): void }>()

function pegarWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./worker-banco.ts', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }: MessageEvent<Retorno>) => {
    const espera = esperando.get(data.id)
    esperando.delete(data.id)
    if (data.ok) espera?.resolver(data.valor)
    else espera?.rejeitar(new Error(data.erro))
  }
  worker.onerror = (e) => {
    for (const espera of esperando.values()) espera.rejeitar(new Error(e.message || t('comum.bancoNaoCarregou')))
    esperando.clear()
    worker = null
  }
  return worker
}

export const banco = new Proxy({} as Banco, {
  get:
    (_, metodo: keyof Banco) =>
    (...args: unknown[]) =>
      new Promise((resolver, rejeitar) => {
        const id = proximoId++
        esperando.set(id, { resolver, rejeitar })
        pegarWorker().postMessage({ id, metodo, args } satisfies Pedido)
      }),
})
