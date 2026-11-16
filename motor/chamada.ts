import { t } from '../mensagens/t'

// O que atravessa a fronteira entre o código do jogador e o motor. O Worker do jogador só
// consegue mandar isto; tudo aqui é dado não confiável e é validado no tradutor.

export const OPERADORES = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is'] as const
export type Operador = (typeof OPERADORES)[number]

export interface Filtro {
  coluna: string
  op: Operador
  valor: unknown
}

export interface ChamadaFrom {
  tipo: 'from'
  tabela: string
  operacao: 'select' | 'insert' | 'update' | 'delete' | null
  /** select: as colunas pedidas ('*' ou 'a, b'). */
  colunas?: string
  /** insert: um objeto ou uma lista. update: um objeto. */
  valores?: unknown
  /** insert/update/delete seguidos de .select(): as colunas devolvidas. */
  retornar?: string
  filtros: Filtro[]
  ordem?: { coluna: string; crescente: boolean }[]
  limite?: number
  /** .single() exige exatamente uma linha; .maybeSingle() aceita nenhuma. */
  unica?: 'single' | 'maybeSingle'
}

export interface ChamadaRpc {
  tipo: 'rpc'
  nome: string
  args: Record<string, unknown>
}

export type ChamadaAuth =
  | { tipo: 'auth'; metodo: 'signUp'; email: unknown; senha: unknown; dados?: unknown }
  | { tipo: 'auth'; metodo: 'signInWithPassword'; email: unknown; senha: unknown }
  | { tipo: 'auth'; metodo: 'updateUser'; dados: unknown }
  | { tipo: 'auth'; metodo: 'getUser' }
  | { tipo: 'auth'; metodo: 'signOut' }

/** A resposta do jogador numa fase de descobrir. Não vem do cliente supabase: vem da tela. */
export interface ChamadaResposta {
  tipo: 'resposta'
  valor: unknown
}

/** Um comando do console SQL do nível 4. */
export interface ChamadaSql {
  tipo: 'sql'
  texto: unknown
}

export type Chamada = ChamadaFrom | ChamadaRpc | ChamadaAuth | ChamadaResposta | ChamadaSql

/** O erro como o supabase-js entrega em `error`. */
export interface ErroCliente {
  message: string
  code: string
  details?: string | null
  hint?: string | null
  status?: number
}

/** O `{ data, error }` do supabase-js. */
export interface RespostaCliente {
  data: unknown
  error: ErroCliente | null
}

/** Chamada malformada ou recurso do supabase-js que o jogo ainda não tem. */
export class ErroDeChamada extends Error {
  constructor(
    message: string,
    readonly code = 'JOGO_NAO_SUPORTADO',
  ) {
    super(message)
    this.name = 'ErroDeChamada'
  }
}

export function aindaNao(oQue: string): ErroDeChamada {
  return new ErroDeChamada(t('cliente.aindaNao', { oQue }))
}
