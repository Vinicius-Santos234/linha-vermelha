import { ident, tabelaPublica } from './sql'
import type { Sessao } from './sessao'
import { regraDe } from './tipos'

export interface Celula {
  /** O usuário enxerga a linha com as políticas atuais. */
  ve: boolean
  /** O gabarito diz que ele deveria enxergar. */
  deveria: boolean
}

export interface GradeDaTabela {
  tabela: string
  /** As colunas da grade: a chave de cada linha da tabela. */
  chaves: string[]
  /** Uma linha da grade por usuário, com uma célula por chave, na mesma ordem. */
  usuarios: { nome: string; celulas: Celula[] }[]
  /** Quantas células estão em vermelho (ve !== deveria). */
  divergencias: number
}

/** O painel "quem vê o quê": para cada usuário, um select com a identidade dele. */
export async function montarGrade(sessao: Sessao): Promise<GradeDaTabela[]> {
  const grades: GradeDaTabela[] = []
  for (const [tabela, linhas] of Object.entries(sessao.verdade)) {
    const regra = regraDe(sessao.fase.def, tabela)
    const chaves = linhas.map((l) => String(l[regra.chave]))
    const grade: GradeDaTabela = { tabela, chaves, usuarios: [], divergencias: 0 }
    for (const usuario of sessao.usuarios) {
      const r = await sessao.executar(usuario.nome, `select ${ident(regra.chave)} as chave from ${tabelaPublica(tabela)}`)
      // Um erro (permissão negada, tabela apagada) conta como "não vê nada".
      const visiveis = new Set((r.data ?? []).map((l) => String(l.chave)))
      const celulas = linhas.map((linha): Celula => ({
        ve: visiveis.has(String(linha[regra.chave])),
        deveria: regra.ler(linha, usuario),
      }))
      grade.divergencias += celulas.filter((c) => c.ve !== c.deveria).length
      grade.usuarios.push({ nome: usuario.nome, celulas })
    }
    grades.push(grade)
  }
  return grades
}
