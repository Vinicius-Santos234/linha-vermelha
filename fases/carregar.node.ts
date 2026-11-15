// Carrega o pacote de fases no ambiente de testes (Vitest). O motor não lê arquivo;
// no navegador, quem entrega os textos é o empacotador do site.
import type { Ataque } from '../cliente/supabase'
import type { Chamada } from '../motor/chamada'
import type { DefinicaoFase, Fase } from '../motor/tipos'

// O Vite exige as opções escritas literalmente em cada chamada.
const definicoes = import.meta.glob<DefinicaoFase>('./*/fase.ts', { import: 'default', eager: true })
const ataques = import.meta.glob<Ataque>('./*/ataque.ts', { import: 'default', eager: true })
const setups = import.meta.glob<string>('./*/setup.sql', { query: '?raw', import: 'default', eager: true })
const politicas = import.meta.glob<string>('./*/politicas.sql', { query: '?raw', import: 'default', eager: true })
const gravados = import.meta.glob<Chamada[]>('./*/ataque.gravado.json', { import: 'default', eager: true })
const solucoes = import.meta.glob<string>('./*/solucao.sql', { query: '?raw', import: 'default', eager: true })
const bases = import.meta.glob<string>('../base.sql', { query: '?raw', import: 'default', eager: true })

export const baseSql = Object.values(bases)[0]!

export interface FaseComReferencia extends Fase {
  pasta: string
  /** Ataque e conserto de referência: existem só para os testes do repositório (D9). */
  ataque: Ataque | undefined
  solucaoSql: string | undefined
  /** O ataque de referência já gravado como chamadas. É o que vai para o site. */
  ataqueGravado: Chamada[] | undefined
}

export const fases: FaseComReferencia[] = Object.keys(definicoes)
  .sort()
  .map((caminho) => {
    const pasta = caminho.slice(0, caminho.lastIndexOf('/'))
    return {
      pasta: pasta.slice(2),
      def: definicoes[caminho]!,
      setupSql: setups[`${pasta}/setup.sql`] ?? '',
      politicasSql: politicas[`${pasta}/politicas.sql`] ?? '',
      ataqueGravado: gravados[`${pasta}/ataque.gravado.json`],
      ataque: ataques[`${pasta}/ataque.ts`],
      solucaoSql: solucoes[`${pasta}/solucao.sql`],
    }
  })

export function fase(id: string): FaseComReferencia {
  const achada = fases.find((f) => f.def.id === id)
  if (!achada) throw new Error(`Não existe a fase ${id}.`)
  return achada
}
