// As fases como as telas as usam: definição + textos já lidos. Não puxa o motor nem o banco.
import { pacotes } from './fases.gerado'
import type { Progresso } from './progresso'
import { lerTexto, type TextoDaFase } from './texto'

export interface FaseDaTela {
  id: string
  nivel: number
  numero: number
  acesso: { email: string; senha: string }
  usuarios: Record<string, string>
  texto: TextoDaFase
  defesaSql: string
  /** Tabelas, dados e políticas furadas num texto só, para carregar no Laboratório. */
  sqlCompleto: string
}

export const fases: FaseDaTela[] = pacotes.map((p) => ({
  id: p.def.id,
  nivel: p.def.nivel,
  numero: Number.parseInt(p.def.id, 10),
  acesso: p.def.acesso,
  usuarios: p.def.usuarios,
  texto: lerTexto(p.texto),
  defesaSql: p.politicasSql,
  sqlCompleto: `${p.setupSql.trimEnd()}\n\n${p.politicasSql}`,
}))

const vencida = (progresso: Progresso, id: string) => Object.keys(progresso[id] ?? {}).length > 0

/** Vencer uma fase em qualquer modo libera a seguinte. A primeira está sempre aberta. */
export function fasesAbertas(progresso: Progresso): FaseDaTela[] {
  return fases.filter((fase, i) => i === 0 || vencida(progresso, fases[i - 1]!.id) || vencida(progresso, fase.id))
}

export function faseDaTela(id: string): FaseDaTela {
  const fase = fases.find((f) => f.id === id)
  if (!fase) throw new Error(`Não existe a fase ${id}.`)
  return fase
}
