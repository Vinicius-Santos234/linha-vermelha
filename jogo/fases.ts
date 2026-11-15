// As fases como as telas as usam: definição + textos já lidos. Não puxa o motor nem o banco.
import { pacotes, type PacoteDeFase } from './fases.gerado'
import { desafioDe, ehDiario, pacoteDe } from './pacotes'
import type { Modo, Progresso } from './progresso'
import { lerTexto, type TextoDaFase } from './texto'

/** Quantas fases o catálogo completo prevê. As que ainda não existem aparecem como "a caminho". */
export const TOTAL_DO_CATALOGO = 13

export interface FaseDaTela {
  id: string
  nivel: number
  numero: number
  /** O nome que aparece no topo da tela: "4. Coluna sem vigia" ou "Desafio de 15/11 · Clínica Vida". */
  rotulo: string
  diario: boolean
  /** Fase de descobrir: a tela pede o valor deduzido em vez de esperar a linha aparecer. */
  pedeResposta: boolean
  acesso: { email: string; senha: string }
  usuarios: Record<string, string>
  texto: TextoDaFase
  defesaSql: string
  /** Tabelas, dados e políticas furadas num texto só, para carregar no Laboratório. */
  sqlCompleto: string
}

function paraTela(p: PacoteDeFase, sufixo = ''): FaseDaTela {
  const texto = lerTexto(p.texto)
  const numero = Number.parseInt(p.def.id, 10)
  return {
    id: p.def.id,
    nivel: p.def.nivel,
    numero,
    rotulo: Number.isNaN(numero) ? `${texto.titulo}${sufixo}` : `${numero}. ${texto.titulo}`,
    diario: ehDiario(p.def.id),
    pedeResposta: p.def.objetivo.tipo === 'descobrir',
    acesso: p.def.acesso,
    usuarios: p.def.usuarios,
    texto,
    defesaSql: p.politicasSql,
    sqlCompleto: `${p.setupSql.trimEnd()}\n\n${p.politicasSql}`,
  }
}

/** As fases fixas, na ordem da trilha. */
export const fases: FaseDaTela[] = pacotes.map((p) => paraTela(p))

const vencida = (progresso: Progresso, id: string) => Object.keys(progresso[id] ?? {}).length > 0

/** Vencer uma fase em qualquer modo libera a seguinte. A primeira está sempre aberta. */
export function fasesAbertas(progresso: Progresso): FaseDaTela[] {
  return fases.filter((fase, i) => i === 0 || vencida(progresso, fases[i - 1]!.id) || vencida(progresso, fase.id))
}

/** Uma fase fixa ou o desafio de um dia ("diario-AAAA-MM-DD"). */
export function faseDaTela(id: string): FaseDaTela {
  if (ehDiario(id)) return paraTela(pacoteDe(id), ` · ${desafioDe(id).cenario.app}`)
  const fase = fases.find((f) => f.id === id)
  if (!fase) throw new Error(`Não existe a fase ${id}.`)
  return fase
}

/** O endereço de uma fase num modo. O desafio diário mora numa página só. */
export function rotaDe(id: string, modo: Modo): string {
  return ehDiario(id) ? `/diario/?modo=${modo}` : `/fase/${id}/${modo}/`
}

/** Para onde "voltar" leva: o mapa de fases ou a página do desafio. */
export const rotaDeVolta = (id: string) => (ehDiario(id) ? '/diario/' : '/fases/')
