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
const estrelas = (pagina) => pagina.locator('.mapa-painel .estrelas .acesa').count()

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
  checar('5. e a fase seguinte volta a estar liberada', (await pagina.locator('.ilha.trancada').count()) === 9)

  await pagina.goto(`${origem}/perfil/`)
  await pagina.locator('.conta-cartao button').waitFor({ timeout: 15000 })
  checar('6a. o perfil mostra as estrelas, "Anônimo" e o botão de entrar', (await pagina.getByText('3 de 99 estrelas').isVisible()) && (await pagina.locator('.conta-cartao h3').innerText()) === 'Anônimo' && (await pagina.locator('.conta-cartao button').innerText()) === 'Entrar com Google')

  // Entrar com o Google sem sair da página: o botão do cabeçalho abre a janela do provedor.
  // No emulador de Auth essa janela é uma tela de contas de teste.
  await pagina.goto(`${origem}/fases/`)
  await pagina.locator('.botao-entrar:not([disabled])').waitFor({ timeout: 15000 })
  checar('6b. o cabeçalho mostra "Anônimo" e o botão de entrar', (await pagina.locator('.topo .conta-chip span').last().innerText()).trim() === 'Anônimo')
  const [janela] = await Promise.all([alice.waitForEvent('page'), pagina.locator('.botao-entrar').click()])
  await janela.waitForLoadState('domcontentloaded')
  try {
    await janela.getByText('Add new account').click({ timeout: 15000 })
    await janela.getByText('Auto-generate user information').click()
    await janela.locator('#display-name-input').fill('Alice de Teste').catch(() => {})
    await janela.getByRole('button', { name: /Sign in with Google/ }).click()
  } catch (e) {
    console.log('JANELA DO EMULADOR:', (await janela.content().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1500))
    throw e
  }
  await pagina.locator('.botao-entrar').waitFor({ state: 'detached', timeout: 20000 })
  const nomeNoTopo = (await pagina.locator('.topo .conta-chip span').last().innerText()).trim()
  checar('6c. depois de entrar, o cabeçalho troca "Anônimo" pelo nome e o botão some', nomeNoTopo !== '' && nomeNoTopo !== 'Anônimo', nomeNoTopo)
  const [vinculada] = await contas()
  checar('6d. a conta é a mesma, agora ligada ao Google: o uid não mudou', (await contas()).length === 1 && vinculada.localId === conta.localId && vinculada.providerUserInfo?.[0]?.providerId === 'google.com', vinculada.localId)
  checar('6e. o progresso continua lá', (await documentos()).length === 1 && (await documentos())[0].uid === conta.localId && (await estrelas(pagina)) === 3)
  await pagina.goto(`${origem}/perfil/`)
  await pagina.locator('.conta-cartao .email').waitFor({ timeout: 15000 })
  const cartao = await pagina.locator('.conta-cartao').innerText()
  checar('6f. o perfil mostra o nome, o e-mail e o avatar da conta, com o botão de sair', (await pagina.locator('.conta-cartao h3').innerText()) === nomeNoTopo && cartao.includes(vinculada.email) && (await pagina.locator('.conta-cartao .avatar:not(.anonimo)').count()) === 1 && (await pagina.locator('.conta-cartao button').allInnerTexts()).join() === 'Sair da conta', `${nomeNoTopo} · ${vinculada.email}`)
  await pagina.screenshot({ path: join(raiz, 'provas/.saida/capturas/18-perfil-logado.png') })
  await pagina.reload()
  await pagina.locator('.conta-cartao .email').waitFor({ timeout: 15000 })
  checar('6g. recarregada a página, a conta continua logada', (await pagina.locator('.topo .conta-chip span').last().innerText()).trim() === nomeNoTopo)

  // Sair: o navegador volta ao começo, e o progresso fica guardado na conta.
  await pagina.goto(`${origem}/fases/`)
  await pagina.locator('.botao-sair').click()
  await pagina.locator('.botao-entrar:not([disabled])').waitFor({ timeout: 20000 })
  checar('6h. sair devolve o cabeçalho a "Anônimo", com o botão de entrar', (await pagina.locator('.topo .conta-chip span').last().innerText()).trim() === 'Anônimo' && (await pagina.locator('.botao-sair').count()) === 0)
  checar('6i. o navegador volta ao começo: sem estrelas, só a fase 1 aberta', (await estrelas(pagina)) === 0 && (await pagina.locator('.ilha.trancada').count()) === 10)
  const depoisDeSair = await documentos()
  checar('6j. o progresso continua intacto na conta, e nenhum documento novo foi criado', depoisDeSair.length === 1 && depoisDeSair[0].uid === conta.localId && depoisDeSair[0].texto.includes('01-rls-desligado') && (await contas()).length === 2, `${(await contas()).length} contas, ${depoisDeSair.length} documento`)

  // Entrar de novo com a mesma conta: é o caso da credencial que já está em uso.
  const [denovo] = await Promise.all([alice.waitForEvent('page'), pagina.locator('.botao-entrar').click()])
  await denovo.waitForLoadState('domcontentloaded')
  try {
    await denovo.getByText(vinculada.email).first().click({ timeout: 15000 })
  } catch (e) {
    console.log('JANELA DO EMULADOR:', (await denovo.content().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1500))
    throw e
  }
  await pagina.locator('.botao-sair').waitFor({ timeout: 20000 })
  checar('6k. entrar de novo com a mesma conta traz o nome de volta', (await pagina.locator('.topo .conta-chip span').last().innerText()).trim() === nomeNoTopo)
  checar('6l. e o progresso volta da nuvem', await ate(async () => (await estrelas(pagina)) === 3), `${await estrelas(pagina)} estrelas`)
  const antesDoBruno = (await contas()).length

  // Outro jogador, em outro navegador: outra conta anônima, sem nada do primeiro.
  const bruno = await navegador.newContext()
  const outra = await bruno.newPage()
  await outra.goto(`${origem}/fases/`)
  await outra.getByRole('link', { name: 'Atacar' }).first().waitFor()
  checar('7. outro navegador vira outro jogador, com outra conta, anônima', (await ate(async () => (await contas()).length === antesDoBruno + 1)) && (await outra.locator('.topo .conta-chip span').last().innerText()).trim() === 'Anônimo', `${(await contas()).length} conta(s)`)
  await new Promise((r) => setTimeout(r, 1500))
  checar('8. e não enxerga o progresso do primeiro', (await estrelas(outra)) === 0, `${await estrelas(outra)} estrelas`)

  checar('9. nenhum erro de página', erros.length === 0, erros.join(' | ').slice(0, 300))
} finally {
  await navegador?.close()
  servidor.close()
}
process.exit(imprimir('Progresso na nuvem (emuladores de Auth e Firestore)', checagens) ? 1 : 0)
