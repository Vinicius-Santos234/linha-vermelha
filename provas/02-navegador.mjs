// Prova de fogo no navegador: sobe um servidor estático, abre o Edge/Chrome instalado
// em modo headless e roda a prova dentro de um Web Worker, na versão fixada do PGlite.
// Uso: npm run prova:navegador
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { imprimir } from './prova.mjs'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.sql': 'text/plain; charset=utf-8',
  '.data': 'application/octet-stream',
}

const servidor = createServer(async (req, res) => {
  const caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
  try {
    const corpo = await readFile(join(raiz, caminho))
    res.writeHead(200, { 'content-type': tipos[extname(caminho)] ?? 'application/octet-stream' })
    res.end(corpo)
  } catch {
    res.writeHead(404).end('não achei')
  }
})
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
const origem = `http://127.0.0.1:${servidor.address().port}`

const versoes = [['PGlite 0.2.17 (a versão fixada)', '@electric-sql/pglite']]

let falhas = 0
let navegador
try {
  navegador = await chromium.launch({ channel: process.env.CANAL ?? 'msedge', headless: true })
  const versaoNavegador = navegador.version()
  for (const [titulo, pacote] of versoes) {
    const pagina = await navegador.newPage()
    const erros = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    pagina.on('console', (m) => m.type() === 'error' && erros.push(m.text()))
    await pagina.goto(`${origem}/provas/navegador/index.html`)
    await pagina.waitForFunction(() => typeof window.rodar === 'function')
    const r = await pagina.evaluate((p) => window.rodar(p), pacote)
    if (r.erro) {
      console.log(`\n=== ${titulo} ===\nFALHA: ${r.erro}\n${erros.join('\n')}`)
      falhas += 1
    } else {
      falhas += imprimir(`${titulo} num Web Worker (${r.ehWorker ? 'worker confirmado' : 'NÃO é worker'}), Edge ${versaoNavegador}, ${r.ms} ms`, r.checagens)
    }
    await pagina.close()
  }
} finally {
  await navegador?.close()
  servidor.close()
}
process.exit(falhas ? 1 : 0)
