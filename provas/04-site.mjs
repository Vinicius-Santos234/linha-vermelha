// Prova do site de ponta a ponta: faz um build próprio, SEM Firebase, serve a pasta
// exportada como um host estático qualquer, joga as fases num navegador de verdade e
// guarda capturas de tela. O build à parte existe para a prova nunca tocar no Firebase
// de verdade, mesmo com o .env.local preenchido. Uso: npm run prova:site
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { chromium } from 'playwright-core'
import { imprimir } from './prova.mjs'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const SAIDA = 'out-prova'
// Variável vazia já definida ganha do .env.local: o build sai sem nuvem.
const semFirebase = Object.fromEntries(['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID', 'EMULADORES'].map((k) => [`NEXT_PUBLIC_FIREBASE_${k}`, '']))
const build = spawnSync('npm', ['run', 'build'], { cwd: raiz, shell: true, encoding: 'utf8', env: { ...process.env, ...semFirebase, SAIDA } })
if (build.status !== 0) {
  console.log(build.stdout.slice(-2000), build.stderr.slice(-2000))
  process.exit(1)
}
const site = join(raiz, SAIDA)
const capturas = join(raiz, 'provas/.saida/capturas')
await mkdir(capturas, { recursive: true })

const tipos = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain', '.data': 'application/octet-stream',
}
const baixado = new Map()
const naoAchados = []
const servidor = createServer(async (req, res) => {
  let caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
  try {
    if ((await stat(join(site, caminho))).isDirectory()) caminho = join(caminho, 'index.html')
    const corpo = await readFile(join(site, caminho))
    baixado.set(caminho.replace(/\\/g, '/'), corpo)
    res.writeHead(200, { 'content-type': tipos[extname(caminho)] ?? 'application/octet-stream' })
    res.end(corpo)
  } catch {
    if (!req.url.startsWith('/pagina-que-nao-existe')) naoAchados.push(req.url)
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    res.end(await readFile(join(site, '404.html')).catch(() => 'não achei'))
  }
})
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
const origem = `http://127.0.0.1:${servidor.address().port}`

const checagens = []
const checar = (nome, ok, detalhe = '') => checagens.push({ nome, ok: !!ok, detalhe: String(detalhe) })
const SOLUCAO = await readFile(join(raiz, 'fases/01-rls-desligado/solucao.sql'), 'utf8')

let navegador
try {
  navegador = await chromium.launch({ channel: process.env.CANAL ?? 'msedge', headless: true })
  const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } })
  const pagina = await contexto.newPage()
  const erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => m.type() === 'error' && !pagina.url().includes('/pagina-que-nao-existe') && erros.push(m.text()))
  const foto = (nome, opcoes = {}) => pagina.screenshot({ path: join(capturas, `${nome}.png`), fullPage: true, ...opcoes })
  const escrever = async (texto) => {
    await pagina.locator('.cm-content').click()
    await pagina.keyboard.press('Control+A')
    await pagina.keyboard.insertText(texto)
  }

  // Roda a bateria e só devolve quando ela terminou: o botão vira "Testando…" e volta.
  const rodarTestes = async () => {
    const botao = pagina.getByRole('button', { name: /Rodar testes/ })
    await botao.waitFor()
    await botao.click()
    await pagina.getByRole('button', { name: /Testando/ }).waitFor({ timeout: 5000 }).catch(() => {})
    await botao.waitFor({ timeout: 60000 })
  }
  const semVermelho = () => pagina.waitForFunction(() => document.querySelectorAll('table.grade td.errado').length === 0, null, { timeout: 15000 }).then(() => true, () => false)

  /** Quantos pixels pintados tem um canvas: zero quer dizer que o fundo não foi desenhado. */
  const pintados = (seletor) => pagina.evaluate((s) => { const c = document.querySelector(s); if (!c) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n }, seletor)
  const dado = (seletor, nome) => pagina.locator(seletor).getAttribute(nome)

  // ---------- Início ----------
  const deFora = new Set()
  pagina.on('request', (r) => new URL(r.url()).hostname !== '127.0.0.1' && deFora.add(new URL(r.url()).hostname))
  await pagina.goto(`${origem}/`)
  await pagina.getByRole('link', { name: /Começar a jogar/ }).waitFor()
  checar('0a. o início oferece começar pela fase 1 no Ataque', (await pagina.getByRole('link', { name: /Começar a jogar/ }).innerText()).includes('Fase 1 · Ataque'))
  checar('0b. e a escolha de modo, com os quatro modos', (await pagina.locator('.modo-cartao').count()) === 4)
  checar('0e. e cobre a página inteira, do topo ao rodapé', await pagina.evaluate(() => { const c = document.querySelector('.palco > canvas.mar').getBoundingClientRect(); const p = document.querySelector('.palco').getBoundingClientRect(); return Math.abs(c.height - p.height) < 2 && p.height > 1200 }))
  checar('0d. o mar em ASCII tomou o lugar do quadriculado na abertura', (await pagina.evaluate(() => { const c = document.querySelector('.palco > canvas.mar'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n })) > 2000)
  await pagina.locator('.trilha .ponto.trancado button').last().click()
  checar('0c. na primeira visita, tocar num ponto trancado mostra a fase sem deixar jogar', (await pagina.locator('.trilha .ponto.trancado').count()) === 10 && (await pagina.locator('.faixa > .ponto-cartao.trancado').count()) === 1 && (await pagina.locator('.faixa > .ponto-cartao .chip-modo').count()) === 0)
  await foto('0-inicio')
  await pagina.goto(`${origem}/fases/`)
  await pagina.getByRole('link', { name: 'Atacar' }).first().waitFor()
  checar('1a. o mapa abre na fase 1, com as 11 ilhas, o tesouro e a rota', (await pagina.locator('.mapa-painel h3').innerText()) === 'RLS desligado' && (await pagina.locator('.mapa button.ilha').count()) === 11 && (await pagina.locator('.ilha.tesouro').count()) === 1 && (await pagina.locator('.rota-apagada').count()) === 1)
  const pintado = (seletor) => pagina.evaluate((s) => { const c = document.querySelector(s); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n }, seletor)
  checar('1d. o mar em ASCII está desenhado no fundo do mapa', (await pintado('.mapa-pagina > canvas.mar')) > 2000, `${await pintado('.mapa-pagina > canvas.mar')} pixels`)
  await pagina.locator('.mapa button.ilha.trancada').last().click()
  checar('1e. tocar numa ilha trancada mostra a fase sem deixar jogar', (await pagina.locator('.mapa-painel .ponto-cartao.trancado h3').innerText()).includes('Não vejo') && (await pagina.locator('.mapa-painel .chip-modo').count()) === 0)
  await pagina.locator('.mapa button.ilha').first().click()
  checar('1f. embaixo de cada ilha fica só o nome da fase', (await pagina.locator('.mapa button.ilha .nome small').count()) === 0 && (await pagina.locator('.mapa button.ilha .nome b').count()) === 11)
  await foto('1-mapa')
  checar('1c. só a primeira das 11 fases começa aberta', (await pagina.locator('.ilha.trancada').count()) === 10 && (await pagina.getByRole('link', { name: 'Atacar' }).count()) === 1)
  checar('1b. o PGlite não é baixado na página inicial', ![...baixado.keys()].some((c) => c.includes('pglite')), [...baixado.keys()].length + ' arquivos')

  // ---------- Ataque ----------
  const inicio = Date.now()
  await pagina.getByRole('link', { name: 'Atacar' }).first().click()
  await pagina.getByText('As respostas do app aparecem aqui.').waitFor({ timeout: 60000 })
  checar('2a. a fase abre e o Postgres sobe na aba', true, `${Date.now() - inicio} ms`)
  checar('2b. o schema aparece, sem as políticas', (await pagina.locator('.schema').innerText()).includes('user_id') && !(await pagina.getByText('RLS desligado', { exact: true }).count()))
  checar('2i. o Ataque tem a varredura de bytes ao fundo, ainda sem a linha cruzada', (await pintados('canvas.fundo-varredura')) > 2000 && (await dado('canvas.fundo-varredura', 'data-cruzou')) === 'false')
  await foto('2-ataque-inicio')

  await pagina.getByRole('button', { name: /Executar/ }).click()
  await pagina.locator('.saida .entrada').first().waitFor()
  checar('2c. o código inicial roda e a resposta aparece', (await pagina.locator('.saida').innerText()).includes('Auth session missing!'))
  checar('2d. ainda não venceu', (await pagina.getByText('Você cruzou a linha').count()) === 0)

  await escrever(`const { data } = await supabase.from('pedidos').select('itens').gt('total', 50)\nconsole.log(data.length)`)
  await pagina.keyboard.press('Control+Enter')
  await pagina.getByText('Você cruzou a linha').waitFor()
  checar('2e. Ctrl+Enter executa e a vitória é detectada sem pedir a coluna id', (await pagina.locator('.saida').innerText()).includes('torta de limão'))
  checar('2j. ao vencer, a linha vermelha acende no fundo', (await dado('canvas.fundo-varredura', 'data-cruzou')) === 'true')
  await foto('3-ataque-vitoria')

  await pagina.getByRole('button', { name: 'Abrir dica 1' }).click()
  await pagina.getByRole('button', { name: 'Abrir dica 2' }).click()
  await pagina.locator('.politicas').waitFor()
  checar('2f. a dica 2 revela as políticas', (await pagina.locator('.politicas').innerText()).includes('RLS desligado'))
  checar('2g. duas dicas deixam uma estrela em jogo', (await pagina.locator('.topo .estrelas .acesa').count()) === 1)

  await escrever('while (true) {}')
  await pagina.keyboard.press('Control+Enter')
  await pagina.getByText('foi interrompido').waitFor({ timeout: 30000 })
  checar('2h. laço infinito é interrompido e a tela continua viva', await pagina.getByRole('button', { name: /Executar/ }).isEnabled())

  // ---------- Defesa ----------
  await pagina.getByRole('link', { name: 'Agora conserte' }).click()
  await pagina.locator('table.grade td.errado').first().waitFor({ timeout: 60000 })
  checar('3a. a grade abre mostrando o vazamento', (await pagina.locator('table.grade td.errado').count()) === 8, `${await pagina.locator('table.grade td.errado').count()} células em vermelho`)
  checar('3f. o escudo da Defesa abre com uma brecha por divergência da grade', (await pintados('canvas.fundo-escudo')) > 2000 && (await dado('canvas.fundo-escudo', 'data-brechas')) === '8')
  await foto('4-defesa-inicio')

  await escrever('alter table public.pedidos enable row level security;')
  await pagina.locator('table.grade td.errado').nth(3).waitFor()
  await pagina.waitForFunction(() => document.querySelectorAll('table.grade td.errado').length === 4)
  checar('3b. a grade se atualiza sozinha enquanto se escreve', true, 'RLS sem política: 4 células, as de quem deixou de ver o que é seu')
  await rodarTestes()
  const falhas = await pagina.locator('.testes li.falhou').allInnerTexts()
  checar('3c. RLS sem política é reprovado só por quebrar o uso legítimo', falhas.length > 0 && falhas.every((f) => f.includes('continua')), `${falhas.length} testes reprovados`)
  await foto('5-defesa-reprovada')

  await escrever('alter tabel pedidos;')
  await pagina.getByText('O SQL não rodou').waitFor()
  checar('3d. SQL inválido mostra o erro do Postgres', (await pagina.locator('.aviso-erro').innerText()).includes('42601'))

  await escrever(SOLUCAO)
  await rodarTestes()
  await pagina.getByText('Linha fechada').waitFor({ timeout: 30000 })
  checar('3e. o conserto de referência passa, a grade fica limpa e a vitória aparece', (await pagina.locator('.testes li.falhou').count()) === 0 && (await semVermelho()), await pagina.locator('.cartao .selo.ok').last().innerText())
  checar('3g. com o conserto, o escudo fica sem brechas e sela', (await dado('canvas.fundo-escudo', 'data-brechas')) === '0' && (await dado('canvas.fundo-escudo', 'data-selado')) === 'true')
  await foto('6-defesa-vitoria')

  // ---------- Progresso e celular ----------
  const SOLUCAO_4 = await readFile(join(raiz, 'fases/04-coluna-sem-vigia/solucao.sql'), 'utf8')
  const POLITICAS_4 = await readFile(join(raiz, 'fases/04-coluna-sem-vigia/politicas.sql'), 'utf8')
  await pagina.getByRole('link', { name: 'Voltar às fases' }).click()
  await pagina.getByRole('link', { name: 'Atacar' }).first().waitFor()
  await pagina.waitForFunction(() => document.querySelectorAll('.mapa-painel .estrelas .acesa').length > 0)
  const acesas = await pagina.locator('.mapa-painel .estrelas .acesa').count()
  checar('4a. o mapa mostra as estrelas ganhas na fase 1 (3 no ataque, 3 na defesa)', acesas === 6 && (await pagina.locator('.ilha.vencida .saldo').innerText()).includes('6'), `${acesas} estrelas`)
  checar('4f. a rota acende até a ilha liberada', (await pagina.locator('.rota-acesa').count()) === 1)
  checar('4c. vencer a fase 1 liberou só a fase 2', (await pagina.locator('.ilha.trancada').count()) === 9)
  await foto('7-mapa-com-estrelas')

  // ---------- Fase 4, no Ciclo completo ----------
  await pagina.goto(`${origem}/fase/04-coluna-sem-vigia/ciclo/`)
  await pagina.getByText('As respostas do app aparecem aqui.').waitFor({ timeout: 60000 })
  checar('5a. o Ciclo abre na etapa de ataque', await pagina.getByText('Etapa 1 de 2 · Ataque').isVisible())
  await escrever(`await supabase.auth.signInWithPassword({ email: 'alice@exemplo.com', password: 'paodequeijo' })
const antes = await supabase.from('pedidos').select('id')
console.log('antes', antes.data.length)`)
  await pagina.keyboard.press('Control+Enter')
  await pagina.getByText('antes 2').waitFor()
  checar('5b. logada, a Alice só vê os 2 pedidos dela, e isso não vence', (await pagina.getByText('Você cruzou a linha').count()) === 0)
  await escrever(`const { data } = await supabase.auth.getUser()
await supabase.from('perfis').update({ is_admin: true }).eq('id', data.user.id)
await supabase.from('pedidos').select('itens, total')`)
  await pagina.keyboard.press('Control+Enter')
  await pagina.getByText('Você cruzou a linha').waitFor()
  checar('5c. a sessão continua entre execuções, e virar admin vence a fase 4', (await pagina.locator('.saida').innerText()).includes('40 coxinhas'))
  await foto('10-ciclo-ataque')

  await pagina.getByRole('button', { name: 'Agora conserte o que você invadiu' }).click()
  await pagina.getByText('Etapa 2 de 2 · Defesa').waitFor()
  await pagina.locator('table.grade').first().waitFor({ timeout: 60000 })
  checar('5d. a Defesa recebe as políticas furadas e conta o ataque do jogador', (await pagina.locator('.cm-content').innerText()).includes('perfil_editar') && (await pagina.getByText(/entrou na bateria: \d+ chamada/).isVisible()))
  checar('5e. nesta fase a grade inicial não acusa nada', (await pagina.locator('table.grade td.errado').count()) === 0)
  await rodarTestes()
  const reprovados = await pagina.locator('.testes li.falhou').allInnerTexts()
  checar('5f. com as políticas furadas, só os dois ataques são reprovados: o da fase e o do jogador', reprovados.length === 2 && reprovados.some((r) => r.includes('o seu ataque')) && reprovados.some((r) => r.includes('o ataque conhecido')), reprovados.map((r) => r.split('\n')[1] ?? r).join(' | '))
  await foto('11-ciclo-defesa-reprovada')

  await escrever(POLITICAS_4 + '\nrevoke update on public.perfis from anon, authenticated;')
  await rodarTestes()
  const semUpdate = await pagina.locator('.testes li.falhou').allInnerTexts()
  checar('5g. tirar o UPDATE inteiro fecha os ataques, mas é reprovado por quebrar a troca de nome', semUpdate.length === 3 && semUpdate.every((r) => r.includes('altera o que é dele em perfis')) && (await pagina.getByRole('heading', { name: 'Ciclo completo' }).count()) === 0, `${semUpdate.length} testes de uso reprovados`)

  await escrever(SOLUCAO_4)
  await rodarTestes()
  await pagina.getByRole('heading', { name: 'Ciclo completo' }).waitFor({ timeout: 30000 })
  checar('5h. o grant por coluna passa em tudo e fecha o Ciclo', (await pagina.locator('.testes li.falhou').count()) === 0, await pagina.locator('.cartao .selo.ok').last().innerText())
  await foto('12-ciclo-vitoria')

  // ---------- Fase 5, no Ataque ----------
  await pagina.goto(`${origem}/fase/05-metadata-do-usuario/ataque/`)
  await pagina.getByText('As respostas do app aparecem aqui.').waitFor({ timeout: 60000 })
  await escrever(`await supabase.auth.signInWithPassword({ email: 'alice@exemplo.com', password: 'paodequeijo' })
await supabase.auth.updateUser({ data: { papel: 'gerente' } })
await supabase.from('pedidos').select()`)
  await pagina.keyboard.press('Control+Enter')
  await pagina.getByText('Você cruzou a linha').waitFor()
  checar('6. a fase 5 cai com o updateUser', (await pagina.locator('.saida').innerText()).includes('Quer casar comigo'))

  // ---------- Laboratório ----------
  await pagina.goto(`${origem}/laboratorio/`)
  await pagina.locator('table.dados').waitFor({ timeout: 60000 })
  const escondidas = () => pagina.locator('table.dados tr.escondida').count()
  checar('7a. o laboratório abre com o exemplo: como anon, só a nota pública aparece', (await escondidas()) === 2)
  await pagina.getByRole('radio', { name: 'ana' }).click()
  checar('7b. trocar de usuário muda o que se vê na hora', (await escondidas()) === 1)
  await pagina.locator('#carregar').selectOption('05-metadata-do-usuario')
  await pagina.getByRole('radio', { name: 'carla' }).waitFor()
  await pagina.getByRole('radio', { name: 'carla' }).click()
  checar('7c. uma fase vencida carrega no laboratório, e a gerente vê tudo', (await escondidas()) === 0 && (await pagina.locator('table.dados tbody tr').count()) === 4)
  checar('7d. só as fases vencidas aparecem para carregar', (await pagina.locator('#carregar option').count()) === 5, `${await pagina.locator('#carregar option').count()} opções`)
  checar('7k. o osciloscópio do laboratório tem um sinal por usuário', (await pintados('canvas.fundo-osciloscopio')) > 500 && (await dado('canvas.fundo-osciloscopio', 'data-sinais')) === String(await pagina.getByRole('radio').count()))
  await foto('13-laboratorio')

  // ---------- As fases novas, jogadas pelo código da dica 3 ----------
  /** Abre as três dicas e devolve o código da última: o ataque ou o conserto de referência. */
  const dica3 = async () => {
    for (const n of [1, 2, 3]) await pagina.getByRole('button', { name: `Abrir dica ${n}` }).click()
    return pagina.locator('.dica').last().locator('pre').last().innerText()
  }
  const abrirAtaque = async (caminho) => {
    await pagina.goto(`${origem}${caminho}`)
    await pagina.getByText('As respostas do app aparecem aqui.').waitFor({ timeout: 60000 })
  }
  const venceComADica = async (caminho) => {
    await abrirAtaque(caminho)
    await escrever(await dica3())
    await pagina.keyboard.press('Control+Enter')
    return pagina.getByText('Você cruzou a linha').waitFor({ timeout: 20000 }).then(() => true, () => false)
  }
  for (const [numero, id] of [[2, '02-politica-provisoria'], [3, '03-linhas-orfas'], [6, '06-entrei-no-time-dos-outros'], [7, '07-o-dominio-certo'], [10, '10-politicas-que-somam']]) {
    checar(`9a. fase ${numero}: o ataque da dica 3 vence`, await venceComADica(`/fase/${id}/ataque/`))
  }
  checar('9b. fase 8: o ataque pela view vence', await venceComADica('/fase/08-a-view-que-ignora-rls/ataque/'))
  checar('9c. e a dica 2 mostra como a view foi criada', (await pagina.locator('.politicas').innerText()).includes('view pedidos_resumo'))
  checar('9d. fase 9: o ataque pela função (rpc) vence', await venceComADica('/fase/09-a-funcao-que-confia-no-parametro/ataque/'))
  checar('9e. o schema lista a função, e a dica 2 mostra o código dela', (await pagina.locator('.schema').innerText()).includes('pedidos_do_usuario') && (await pagina.locator('.politicas').innerText()).includes('SECURITY DEFINER'))

  // Fase 11: mil tentativas dentro do tempo limite, e a resposta digitada.
  await abrirAtaque('/fase/11-nao-vejo-mas-sei-que-existe/ataque/')
  await escrever(await dica3())
  const inicioDoLaco = Date.now()
  await pagina.keyboard.press('Control+Enter')
  await pagina.getByRole('button', { name: /Executando/ }).waitFor({ timeout: 5000 }).catch(() => {})
  await pagina.getByRole('button', { name: /Executar/ }).waitFor({ timeout: 40000 })
  const saidaDoLaco = await pagina.locator('.saida').innerText()
  checar('10a. fase 11: o laço de mil tentativas termina dentro do tempo limite', !saidaDoLaco.includes('foi interrompido'), `${Date.now() - inicioDoLaco} ms`)
  checar('10b. o erro de valor repetido entrega o código do Bruno, sem a linha aparecer', saidaDoLaco.includes('já existe: PADARIA-042') && (await pagina.getByText('Você cruzou a linha').count()) === 0)
  await pagina.getByLabel('O valor que você descobriu').fill('PADARIA-999')
  await pagina.getByRole('button', { name: 'Conferir' }).click()
  await pagina.getByText('Não é esse').waitFor()
  await pagina.getByLabel('O valor que você descobriu').fill('padaria-042')
  await pagina.getByRole('button', { name: 'Conferir' }).click()
  checar('10c. a resposta errada é recusada, e a certa vence a fase', await pagina.getByText('Você cruzou a linha').waitFor({ timeout: 10000 }).then(() => true, () => false))

  // ---------- Desafio diário ----------
  await pagina.goto(`${origem}/diario/`)
  await pagina.getByRole('link', { name: 'Atacar' }).waitFor({ timeout: 20000 })
  const tituloDoDia = await pagina.locator('h1').innerText()
  checar('11a. a página do desafio mostra o de hoje, com sequência zerada', /Desafio de \d\d\/\d\d · /.test(tituloDoDia) && (await pagina.getByText('Sequência: 0 dia(s)').count()) === 1, tituloDoDia)
  const fracao = Number(await dado('svg.relogio', 'data-fracao'))
  checar('11e. o relógio do desafio marca a hora, com a contagem e os sete dias', fracao > 0 && fracao < 1 && (await pagina.getByText(/Troca em \d+ h \d\d min/).count()) === 1 && (await pagina.locator('.semana li').count()) === 7 && (await pagina.locator('.semana li.feito').count()) === 0)
  await foto('15-diario')
  await pagina.getByRole('link', { name: 'Atacar' }).click()
  await pagina.getByText('As respostas do app aparecem aqui.').waitFor({ timeout: 60000 })
  await escrever(await dica3())
  await pagina.keyboard.press('Control+Enter')
  checar('11b. o ataque de referência do dia vence', await pagina.getByText('Você cruzou a linha').waitFor({ timeout: 20000 }).then(() => true, () => false), tituloDoDia)
  await pagina.getByRole('link', { name: 'Agora conserte' }).click()
  await pagina.locator('table.grade').first().waitFor({ timeout: 60000 })
  await escrever(await dica3())
  await rodarTestes()
  checar('11c. o conserto de referência do dia passa na bateria', await pagina.getByText('Linha fechada').waitFor({ timeout: 30000 }).then(() => true, () => false), (await pagina.locator('.testes li.falhou').allInnerTexts()).join(' | ').slice(0, 200))
  await pagina.getByRole('link', { name: 'Voltar às fases' }).click()
  await pagina.getByText('Sequência: 1 dia(s)').waitFor({ timeout: 10000 })
  checar('11d. vencer o desafio conta um dia de sequência e marca o dia de hoje', (await pagina.getByText('O de hoje está feito').count()) === 1 && (await pagina.locator('.semana li.hoje.feito').count()) === 1)

  // ---------- A abertura com a trilha e o desafio ----------
  await pagina.goto(`${origem}/`)
  await pagina.locator('.diario-cartao').waitFor({ timeout: 20000 })
  checar('12a. a trilha tem as 11 fases e o ponto das que vêm', (await pagina.locator('.trilha .ponto').count()) === 12 && (await pagina.locator('.trilha .ponto.futuro').innerText()).trim() === '+2')
  checar('12b. a abertura mostra o desafio de hoje, já com as estrelas', (await pagina.locator('.diario-cartao .estrelas .acesa').count()) > 0 && (await pagina.locator('.diario-cartao').innerText()).includes('Jogar de novo'))
  await pagina.locator('.trilha .ponto button').last().click()
  checar('12c. com tudo vencido, nenhum ponto fica trancado e o último abre para jogar', (await pagina.locator('.trilha .ponto.trancado').count()) === 0 && (await pagina.locator('.faixa > .ponto-cartao .chip-modo').count()) === 3 && (await pagina.locator('.faixa > .ponto-cartao h3').innerText()).includes('Não vejo'))
  await foto('16-abertura')

  // ---------- Perfil, ajuda e página não encontrada ----------
  await pagina.goto(`${origem}/perfil/`)
  await pagina.locator('.numeros').waitFor()
  const total = Number((await pagina.locator('h1').innerText()).match(/^(\d+) de 99/)?.[1])
  checar('13a. no perfil, as estrelas ganhas estão acesas nas constelações', total > 0 && (await pintados('canvas.fundo-constelacao')) > 200 && (await dado('canvas.fundo-constelacao', 'data-acesas')) === String(total), `${total} estrelas`)
  checar('13b. e os números contam as fases, a sequência e os desafios', (await pagina.locator('.numeros').innerText()).includes('11 / 11') && (await pagina.locator('.numeros > div').count()) === 4)
  await foto('17-perfil')
  await pagina.goto(`${origem}/ajuda/`)
  await pagina.locator('.sumario a').first().waitFor()
  checar('13c. a ajuda tem um sumário com as nove seções', (await pagina.locator('.sumario a').count()) === 9 && (await pagina.locator('.caderno section').count()) === 9)
  await pagina.locator('.sumario a', { hasText: 'Desafio diário' }).click()
  checar('13d. o sumário leva à seção e a marca', await pagina.waitForFunction(() => document.querySelector('.sumario a[aria-current="true"]')?.textContent.includes('Desafio diário') && location.hash === '#desafio-diario', null, { timeout: 8000 }).then(() => true, () => false))
  await pagina.goto(`${origem}/pagina-que-nao-existe/`)
  checar('13e. um endereço que não existe cai em "Fora do mapa", com o mar', (await pagina.getByRole('heading', { name: 'Fora do mapa' }).count()) === 1 && (await pintados('.fora-do-mapa > canvas.mar')) > 2000)

  // ---------- Continuar e ajuda ----------
  await pagina.goto(`${origem}/`)
  await pagina.locator('a.jogar').waitFor()
  checar('7e. com progresso, o início vira "Continuar" e aponta o que falta (o Ciclo da fase 1)', (await pagina.locator('a.jogar').innerText()).includes('Fase 1 · Ciclo completo'), (await pagina.locator('a.jogar').innerText()).replace(/\n/g, ' '))
  await pagina.goto(`${origem}/ajuda/`)
  const ajuda = await pagina.locator('main').innerText()
  checar('7f. a ajuda lista o que o cliente tem e o que não tem', ajuda.includes('.maybeSingle()') && ajuda.includes('supabase.auth.updateUser({ data })') && ajuda.includes('.range()'))
  await foto('14-ajuda')
  await pagina.goto(`${origem}/fase/01-rls-desligado/ataque/`)
  await pagina.getByText('As respostas do app aparecem aqui.').waitFor({ timeout: 60000 })
  checar('7g. o console tem o atalho para a ajuda', (await pagina.getByRole('link', { name: 'Ajuda' }).getAttribute('href')) === '/ajuda/')
  await escrever(`await supabase.from('pedidos').select().range(0, 9)`)
  await pagina.keyboard.press('Control+Enter')
  await pagina.getByText('ainda não neste jogo').waitFor()
  checar('7h. método que o jogo não tem aponta para a Ajuda', (await pagina.locator('.saida').innerText()).includes('está na Ajuda'))
  await pagina.getByRole('button', { name: 'Abrir dica 1' }).click()
  await pagina.getByRole('button', { name: 'Abrir dica 2' }).click()
  checar('7i. a dica 2 da fase 1 fala da chave pública e das Rules do Firebase', (await pagina.getByText('pública por design').count()) > 0)
  checar('7j. sem Firebase configurado, a prova não fala com nenhum servidor de fora', deFora.size === 0, [...deFora].join(', '))

  await pagina.setViewportSize({ width: 390, height: 844 })
  await pagina.goto(`${origem}/fase/01-rls-desligado/defesa/`)
  await pagina.locator('table.grade').waitFor({ timeout: 60000 })
  const transborda = await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  checar('4b. a 390 px a página não rola para o lado', !transborda)
  await foto('8-defesa-celular')
  await pagina.goto(`${origem}/fases/`)
  await pagina.getByRole('link', { name: 'Atacar' }).first().waitFor()
  checar('4e. a 390 px o mapa desce em zigue-zague e não rola para o lado', !(await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) && (await pagina.locator('.mapa button.ilha').count()) === 11)
  await foto('9-mapa-celular')
  await pagina.goto(`${origem}/`)
  await pagina.getByRole('link', { name: /Continuar/ }).waitFor()
  checar('4d. a 390 px o início também não rola para o lado', !(await pagina.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)))
  await foto('9-inicio-celular')

  checar('8. nenhum erro no console do navegador nem arquivo faltando', erros.length === 0 && naoAchados.length === 0, [...new Set(naoAchados), ...erros.filter((e) => !e.includes('404'))].join(' | ').slice(0, 400))

  // O número que estava "de memória" no documento: o peso do download do PGlite.
  const pglite = [...baixado.entries()].filter(([c]) => c.includes('pglite'))
  const cru = pglite.reduce((s, [, b]) => s + b.length, 0)
  const comprimido = pglite.reduce((s, [, b]) => s + gzipSync(b).length, 0)
  console.log(`\nPGlite baixado ao entrar na fase: ${pglite.length} arquivos, ${(cru / 1e6).toFixed(1)} MB, ${(comprimido / 1e6).toFixed(1)} MB com gzip`)
} finally {
  await navegador?.close()
  servidor.close()
}
process.exit(imprimir('Site estático exportado, sem Firebase, no Edge', checagens) ? 1 : 0)
