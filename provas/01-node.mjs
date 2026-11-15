// Prova de fogo em Node: roda a prova na versão do PGlite fixada no package.json.
// Uso: npm run prova:node
import { readFile } from 'node:fs/promises'
import { rodarProva, imprimir } from './prova.mjs'

const ler = (caminho) => readFile(new URL(`../${caminho}`, import.meta.url), 'utf8')
const sqls = {
  base: await ler('base.sql'),
  setup: await ler('fases/01-rls-desligado/setup.sql'),
  solucao: await ler('fases/01-rls-desligado/solucao.sql'),
}

// Para comparar com outra versão: npm i pglite-teste@npm:@electric-sql/pglite@X e
// acrescentar ['PGlite X', 'pglite-teste'] aqui.
const versoes = [['PGlite 0.2.17 (a versão fixada)', '@electric-sql/pglite']]

let falhas = 0
for (const [titulo, pacote] of versoes) {
  try {
    const { PGlite } = await import(pacote)
    falhas += imprimir(`${titulo} em Node ${process.version}`, await rodarProva(PGlite, sqls))
  } catch (e) {
    console.log(`\n=== ${titulo} ===\nFALHA ao carregar: ${e.message}`)
    falhas += 1
  }
}
process.exit(falhas ? 1 : 0)
