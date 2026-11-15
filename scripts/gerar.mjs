// Prepara o que o site precisa e que não depende de empacotador (D15):
// 1. jogo/fases.gerado.ts: o pacote de fases como texto (base.sql, setup.sql, pt-BR.md,
//    politicas.sql e o ataque já gravado como chamadas). O ataque.ts e o solucao.sql
//    ficam de fora: são só dos testes.
// 2. public/pglite-<versão>/: o PGlite como arquivo estático, carregado só dentro do
//    Worker do banco. A versão no caminho permite cache longo e imutável.
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const ler = (...partes) => readFile(join(raiz, ...partes), 'utf8')
const lerSeExistir = async (...partes) => (existsSync(join(raiz, ...partes)) ? ler(...partes) : '')

// ---------- 1. Fases ----------
const pastas = (await readdir(join(raiz, 'fases'), { withFileTypes: true }))
  .filter((d) => d.isDirectory() && existsSync(join(raiz, 'fases', d.name, 'fase.ts')))
  .map((d) => d.name)
  .sort()

const { version: versaoPGlite } = JSON.parse(await ler('node_modules/@electric-sql/pglite/package.json'))

const linhas = [
  '// GERADO por scripts/gerar.mjs. Não editar: mude os arquivos em fases/ e rode `npm run gerar`.',
  "import type { Chamada } from '../motor/chamada'",
  "import type { DefinicaoFase } from '../motor/tipos'",
  ...pastas.map((p, i) => `import def${i} from '../fases/${p}/fase'`),
  '',
  'export interface PacoteDeFase {',
  '  def: DefinicaoFase',
  '  setupSql: string',
  '  /** O pt-BR.md da fase: briefings, dicas e explicação. */',
  '  texto: string',
  '  /** As políticas furadas: rodam no Ataque e são o que o editor da Defesa mostra ao abrir. */',
  '  politicasSql: string',
  '  /** O ataque conhecido da fase, como chamadas. A bateria da Defesa o reproduz. */',
  '  ataqueGravado: Chamada[]',
  '}',
  '',
  `export const versaoPGlite = ${JSON.stringify(versaoPGlite)}`,
  `export const baseSql = ${JSON.stringify(await ler('base.sql'))}`,
  '/** O texto da página de ajuda (mensagens/ajuda.pt-BR.md). */',
  `export const ajuda = ${JSON.stringify(await ler('mensagens/ajuda.pt-BR.md'))}`,
  '',
  'export const pacotes: PacoteDeFase[] = [',
]
for (const [i, p] of pastas.entries()) {
  for (const obrigatorio of ['setup.sql', 'politicas.sql', 'pt-BR.md', 'ataque.gravado.json']) {
    if (!existsSync(join(raiz, 'fases', p, obrigatorio))) throw new Error(`fases/${p}: falta o ${obrigatorio}`)
  }
  linhas.push(
    '  {',
    `    def: def${i},`,
    `    setupSql: ${JSON.stringify(await ler('fases', p, 'setup.sql'))},`,
    `    texto: ${JSON.stringify(await ler('fases', p, 'pt-BR.md'))},`,
    `    politicasSql: ${JSON.stringify(await ler('fases', p, 'politicas.sql'))},`,
    `    ataqueGravado: ${JSON.stringify(JSON.parse(await ler('fases', p, 'ataque.gravado.json')))},`,
    '  },',
  )
}
linhas.push(']', '')
await writeFile(join(raiz, 'jogo', 'fases.gerado.ts'), linhas.join('\n'))

// ---------- 2. PGlite estático ----------
const origem = join(raiz, 'node_modules/@electric-sql/pglite/dist')
const destino = join(raiz, 'public', `pglite-${versaoPGlite}`)
if (!existsSync(join(destino, 'postgres.wasm'))) {
  for (const antiga of existsSync(join(raiz, 'public')) ? await readdir(join(raiz, 'public')) : []) {
    if (antiga.startsWith('pglite-')) await rm(join(raiz, 'public', antiga), { recursive: true })
  }
  await mkdir(join(destino, 'fs'), { recursive: true })
  const serve = (nome) => nome.endsWith('.js') || nome === 'postgres.wasm' || nome === 'postgres.data'
  for (const nome of (await readdir(origem)).filter(serve)) await cp(join(origem, nome), join(destino, nome))
  for (const nome of (await readdir(join(origem, 'fs'))).filter(serve)) await cp(join(origem, 'fs', nome), join(destino, 'fs', nome))
}

console.log(`gerar: ${pastas.length} fase(s), PGlite ${versaoPGlite} em public/pglite-${versaoPGlite}/`)
