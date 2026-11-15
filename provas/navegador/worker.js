// Web Worker da prova: carrega o PGlite da versão pedida e roda a mesma prova do Node.
import { rodarProva } from '/provas/prova.mjs'

self.onmessage = async ({ data: pacote }) => {
  try {
    const inicio = performance.now()
    const { PGlite } = await import(`/node_modules/${pacote}/dist/index.js`)
    const ler = (caminho) => fetch(caminho).then((r) => r.text())
    const sqls = {
      base: await ler('/base.sql'),
      setup: await ler('/fases/01-rls-desligado/setup.sql'),
      solucao: await ler('/fases/01-rls-desligado/solucao.sql'),
    }
    const checagens = await rodarProva(PGlite, sqls)
    self.postMessage({
      checagens,
      ms: Math.round(performance.now() - inicio),
      ehWorker: typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope,
    })
  } catch (e) {
    self.postMessage({ erro: `${e.name}: ${e.message}` })
  }
}
