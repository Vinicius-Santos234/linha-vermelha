// Gera docs/demo.gif e as capturas do README jogando o site num navegador de verdade.
// Usa o build sem Firebase que a prova do site deixa em out-prova/.
// Uso: npm run prova:site && npm run gif
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import gifenc from 'gifenc'
import { chromium } from 'playwright-core'
import { PNG } from 'pngjs'

const { GIFEncoder, quantize, applyPalette } = gifenc
const raiz = fileURLToPath(new URL('..', import.meta.url))
const site = join(raiz, 'out-prova')
const docs = join(raiz, 'docs')
if (!existsSync(site)) throw new Error('Falta a pasta out-prova/. Rode antes: npm run prova:site')
await mkdir(docs, { recursive: true })

const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' }
const servidor = createServer(async (req, res) => {
  let caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
  try {
    if ((await stat(join(site, caminho))).isDirectory()) caminho = join(caminho, 'index.html')
    res.writeHead(200, { 'content-type': tipos[extname(caminho)] ?? 'application/octet-stream' })
    res.end(await readFile(join(site, caminho)))
  } catch {
    res.writeHead(404).end('não achei')
  }
})
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
const origem = `http://127.0.0.1:${servidor.address().port}`

const LARGURA = 1200
const ALTURA = 700
const quadros = []
const navegador = await chromium.launch({ channel: process.env.CANAL ?? 'msedge', headless: true })
try {
  const pagina = await (await navegador.newContext({ viewport: { width: LARGURA, height: ALTURA } })).newPage()
  /** Guarda o que está na tela como um quadro do GIF e, se pedido, como PNG do README. */
  const quadro = async (segundos, png) => {
    await pagina.waitForTimeout(350)
    const imagem = await pagina.screenshot()
    quadros.push({ imagem, segundos })
    if (png) await writeFile(join(docs, png), imagem)
  }
  const topo = () => pagina.evaluate(() => scrollTo(0, 0))
  const escrever = async (texto) => {
    await pagina.locator('.cm-content').click()
    await pagina.keyboard.press('Control+A')
    await pagina.keyboard.insertText(texto)
  }
  const rodarTestes = async () => {
    const botao = pagina.getByRole('button', { name: /Rodar testes/ })
    await botao.click()
    await pagina.getByRole('button', { name: /Testando/ }).waitFor({ timeout: 5000 }).catch(() => {})
    await botao.waitFor({ timeout: 60000 })
  }

  // 1. O início.
  await pagina.goto(`${origem}/`)
  await pagina.getByRole('link', { name: /Começar a jogar/ }).waitFor()
  await pagina.locator('.cena.borda-quente .selo.visivel').waitFor({ timeout: 30000 })
  await quadro(2.4, 'inicio.png')
  await pagina.locator('.cena.borda-fria .selo.visivel').waitFor({ timeout: 30000 })
  await quadro(2.4)

  // 2. Ataque: o briefing, o código e a vitória.
  await pagina.goto(`${origem}/fase/01-rls-desligado/ataque/`)
  await pagina.getByText('As respostas do app aparecem aqui.').waitFor({ timeout: 60000 })
  await quadro(2.2)
  await escrever(`// Sem login. Só a chave pública, como qualquer visitante.\nconst { data } = await supabase.from('pedidos').select()\nconsole.log(data.length, 'pedidos')`)
  await topo()
  await quadro(2)
  await pagina.keyboard.press('Control+Enter')
  await pagina.getByText('Você cruzou a linha').waitFor()
  await topo()
  await quadro(2.6, 'ataque.png')
  await pagina.locator('.saida').scrollIntoViewIfNeeded()
  await quadro(2.2)

  // 3. Defesa: a grade em vermelho, um conserto pela metade e o conserto de verdade.
  await pagina.goto(`${origem}/fase/01-rls-desligado/defesa/`)
  await pagina.locator('table.grade td.errado').first().waitFor({ timeout: 60000 })
  await topo()
  await quadro(2.4)
  await escrever('-- Só ligar o RLS tranca todo mundo para fora.\nalter table public.pedidos enable row level security;')
  await rodarTestes()
  await topo()
  await quadro(2.6, 'defesa.png')
  await escrever(await readFile(join(raiz, 'fases/01-rls-desligado/solucao.sql'), 'utf8'))
  await rodarTestes()
  await pagina.getByText('Linha fechada').waitFor({ timeout: 30000 })
  await pagina.waitForFunction(() => document.querySelectorAll('table.grade td.errado').length === 0)
  await topo()
  await quadro(2.2)
  await pagina.locator('table.grade').scrollIntoViewIfNeeded()
  await quadro(2.8)

  // 4. O laboratório.
  await pagina.goto(`${origem}/laboratorio/`)
  await pagina.locator('table.dados').waitFor({ timeout: 60000 })
  await pagina.getByRole('radio', { name: 'ana' }).click()
  await quadro(2.6, 'laboratorio.png')
} finally {
  await navegador.close()
  servidor.close()
}

// Monta o GIF. Cada quadro ganha a própria paleta: a tela é escura e tem poucos tons.
const gif = GIFEncoder()
for (const { imagem, segundos } of quadros) {
  const { data, width, height } = PNG.sync.read(imagem)
  const paleta = quantize(data, 256)
  gif.writeFrame(applyPalette(data, paleta), width, height, { palette: paleta, delay: segundos * 1000 })
}
gif.finish()
await writeFile(join(docs, 'demo.gif'), gif.bytes())
console.log(`gif: ${quadros.length} quadros, ${(gif.bytes().length / 1e6).toFixed(1)} MB em docs/demo.gif`)
