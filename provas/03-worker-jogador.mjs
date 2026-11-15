// Prova do Worker do jogador (D6) num navegador de verdade: o código digitado roda
// isolado, só fala por mensagem, e um laço infinito é morto sem travar a página.
// Uso: npm run prova:jogador
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { rolldown } from 'rolldown'
import { imprimir } from './prova.mjs'

const raiz = fileURLToPath(new URL('..', import.meta.url))

// Empacota o Worker e a página, como o Next vai fazer no site.
for (const [entrada, saida] of [
  ['cliente/worker-jogador.ts', 'worker-jogador.js'],
  ['provas/navegador/pagina-jogador.ts', 'pagina-jogador.js'],
]) {
  const pacote = await rolldown({ input: join(raiz, entrada), logLevel: 'silent' })
  await pacote.write({ file: join(raiz, 'provas/.saida', saida), format: 'iife' })
  await pacote.close()
}

const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' }
const servidor = createServer(async (req, res) => {
  const caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
  try {
    const corpo = caminho.endsWith('jogador.html')
      ? '<!doctype html><meta charset="utf-8"><script src="/provas/.saida/pagina-jogador.js"></script>'
      : await readFile(join(raiz, caminho))
    res.writeHead(200, { 'content-type': tipos[extname(caminho)] ?? 'application/octet-stream' })
    res.end(corpo)
  } catch {
    res.writeHead(404).end('não achei')
  }
})
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))

const checagens = []
const checar = (nome, ok, detalhe = '') => checagens.push({ nome, ok: !!ok, detalhe: String(detalhe) })
let navegador
try {
  navegador = await chromium.launch({ channel: process.env.CANAL ?? 'msedge', headless: true })
  const pagina = await navegador.newPage()
  await pagina.goto(`http://127.0.0.1:${servidor.address().port}/jogador.html`)
  await pagina.waitForFunction(() => typeof window.rodar === 'function')
  const rodar = (codigo, limite) => pagina.evaluate(([c, l]) => window.rodar(c, l), [codigo, limite])

  const a = await rodar(`
    const { data } = await supabase.from('pedidos').select('id').eq('id', 7)
    console.log('veio', data)
    await supabase.auth.signInWithPassword({ email: 'a@b.c', password: 'x' })`)
  checar('1a. o código roda e termina', a.ok && !a.erro, a.erro ?? `${a.ms} ms`)
  checar(
    '1b. cada chamada chega serializada à página',
    a.chamadas.length === 2 && a.chamadas[0].tabela === 'pedidos' && a.chamadas[0].filtros[0].valor === 7 && a.chamadas[1].metodo === 'signInWithPassword',
    JSON.stringify(a.chamadas[0]),
  )
  checar('1c. a resposta volta para o código, e o console chega à página', a.console[0]?.includes('"eco": "pedidos"'), a.console[0]?.replace(/\s+/g, ' '))

  const b = await rodar('while (true) {}', 800)
  checar('2a. laço infinito é morto pelo tempo limite', !b.ok && b.estourouTempo, `${b.ms} ms: ${b.erro}`)
  const vivo = await pagina.evaluate(() => 1 + 1)
  checar('2b. a página continua respondendo depois', vivo === 2)
  const c = await rodar(`console.log('de novo')`)
  checar('2c. a execução seguinte roda num Worker novo', c.ok && c.console[0] === 'log: de novo', c.console[0])

  const d = await rodar(`for (let i = 0; ; i++) await supabase.from('cupons').insert({ codigo: i })`, 800)
  checar('3. laço infinito com await também é morto, e as chamadas dele chegaram', d.estourouTempo && d.chamadas.length > 10, `${d.chamadas.length} chamadas`)

  const e = await rodar(`throw new Error('quebrei')`)
  checar('4a. exceção do código vira erro, sem derrubar nada', !e.ok && e.erro === 'Error: quebrei' && !e.estourouTempo, e.erro)
  const f = await rodar('const x = ;')
  checar('4b. erro de sintaxe também', !f.ok && f.erro?.startsWith('SyntaxError'), f.erro)
  const g = await rodar(`await supabase.from('pedidos').select().range(0, 9)`)
  checar('4c. método que o jogo não tem avisa com clareza', g.erro?.includes('ainda não neste jogo'), g.erro)

  const h = await rodar(`console.log([typeof document, typeof window, typeof localStorage, typeof indexedDB === 'undefined' ? 'sem idb' : 'com idb'].join(' '))`)
  checar('5. o Worker não enxerga a página (document, window, localStorage)', h.console[0]?.startsWith('log: undefined undefined undefined'), h.console[0])
} finally {
  await navegador?.close()
  servidor.close()
}
process.exit(imprimir('Worker do jogador no Edge', checagens) ? 1 : 0)
