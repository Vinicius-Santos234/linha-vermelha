// Prova do progresso na nuvem, contra os emuladores de Auth e Firestore: login anônimo,
// gravação em progresso/{uid}, volta do progresso depois de apagar o navegador, e
// isolamento entre jogadores. Uso: npm run prova:nuvem (sobe os emuladores e roda isto).
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { imprimir } from './prova.mjs'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const PROJETO = 'demo-linha-vermelha'
const SAIDA = 'out-emulador'

// Um build à parte, apontado para os emuladores, numa pasta que nunca vai para o ar.
const build = spawnSync('npm', ['run', 'build'], {
  cwd: raiz,
  shell: true,
  encoding: 'utf8',
  env: {
    ...process.env,
    SAIDA,
    NEXT_PUBLIC_FIREBASE_API_KEY: 'chave-de-mentira',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJETO}.firebaseapp.com`,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJETO,
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:1:web:1',
    NEXT_PUBLIC_FIREBASE_EMULADORES: '1',
  },
})
if (build.status !== 0) {
  console.log(build.stdout.slice(-2000), build.stderr.slice(-2000))
  process.exit(1)
}

const site = join(raiz, SAIDA)
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

// Lê o Firestore por cima das regras, como o console do Firebase faria.
async function documentos() {
  const r = await fetch(`http://127.0.0.1:8080/v1/projects/${PROJETO}/databases/(default)/documents/progresso`, { headers: { Authorization: 'Bearer owner' } })
  return ((await r.json()).documents ?? []).map((d) => ({ uid: d.name.split('/').pop(), texto: JSON.stringify(d.fields) }))
}
// As contas que o emulador de Auth conhece.
async function contas() {
  const r = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJETO}/accounts:query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: '{}',
  })
  return (await r.json()).userInfo ?? []
}
async function ate(condicao, ms = 15000) {
  for (const fim = Date.now() + ms; Date.now() < fim; await new Promise((r) => setTimeout(r, 250))) if (await condicao()) return true
  return false
}

const checagens = []
const checar = (nome, ok, detalhe = '') => checagens.push({ nome, ok: !!ok, detalhe: String(detalhe) })
const estrelas = (pagina) => pagina.locator('.fase-cartao .estrelas .acesa').count()

let navegador
try {
  navegador = await chromium.launch({ channel: process.env.CANAL ?? 'msedge', headless: true })
  const alice = await navegador.newContext()
  const pagina = await alice.newPage()
  const erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))

  await pagina.goto(`${origem}/fases/`)
  await pagina.getByRole('link', { name: 'Atacar' }).first().waitFor()
  checar('1a. na primeira visita o jogador ganha uma conta anônima, sem cadastro', await ate(async () => (await contas()).length === 1), `${(await contas()).length} conta(s)`)
  const [conta] = await contas()
  checar('1b. a conta é anônima e ainda não há escrita no Firestore', !conta?.email && !conta?.providerUserInfo?.length && (await documentos()).length === 0, `${(await documentos()).length} documento(s)`)

  await pagina.getByRole('link', { name: 'Atacar' }).first().click()
  await pagina.getByText('As respostas do app aparecem aqui.').waitFor({ timeout: 60000 })
  await pagina.locator('.cm-content').click()
  await pagina.keyboard.press('Control+A')
  await pagina.keyboard.insertText(`await supabase.from('pedidos').select()`)
  await pagina.keyboard.press('Control+Enter')
  await pagina.getByText('Você cruzou a linha').waitFor()
  checar('2. vencer a fase grava a conquista no Firestore', await ate(async () => (await documentos())[0]?.texto.includes('01-rls-desligado')), (await documentos())[0]?.texto.slice(0, 160))
  checar('3. o documento fica em progresso/{uid}, com o uid da conta anônima', (await documentos()).length === 1 && (await documentos())[0].uid === conta?.localId, conta?.localId)

  // Apaga o que o jogo guardou no navegador, mas não o login: o progresso tem de voltar da nuvem.
  await pagina.goto(`${origem}/perfil/`)
  await pagina.evaluate(() => localStorage.clear())
  await pagina.goto(`${origem}/fases/`)
  await pagina.getByRole('link', { name: 'Atacar' }).first().waitFor()
  checar('4. apagado o armazenamento do navegador, as estrelas voltam do Firestore', await ate(async () => (await estrelas(pagina)) === 3), `${await estrelas(pagina)} estrelas`)
  checar('5. e a fase seguinte volta a estar liberada', (await pagina.locator('.fase-cartao.trancada').count()) === 1)

  await pagina.goto(`${origem}/perfil/`)
  await pagina.getByRole('button', { name: 'Salvar progresso com Google' }).waitFor({ timeout: 15000 })
  checar('6. o perfil mostra as estrelas e oferece o vínculo com o Google', await pagina.getByText('3 de 27 estrelas').isVisible())

  // Outro jogador, em outro navegador: outra conta anônima, sem nada do primeiro.
  const bruno = await navegador.newContext()
  const outra = await bruno.newPage()
  await outra.goto(`${origem}/fases/`)
  await outra.getByRole('link', { name: 'Atacar' }).first().waitFor()
  checar('7. outro navegador vira outro jogador, com outra conta', await ate(async () => (await contas()).length === 2), `${(await contas()).length} conta(s)`)
  await new Promise((r) => setTimeout(r, 1500))
  checar('8. e não enxerga o progresso do primeiro', (await estrelas(outra)) === 0, `${await estrelas(outra)} estrelas`)

  checar('9. nenhum erro de página', erros.length === 0, erros.join(' | ').slice(0, 300))
} finally {
  await navegador?.close()
  servidor.close()
}
process.exit(imprimir('Progresso na nuvem (emuladores de Auth e Firestore)', checagens) ? 1 : 0)
