// O cliente supabase-js de mentira. É a única coisa que o código do jogador enxerga.
// Não guarda estado nem fala com o banco: cada chamada vira uma mensagem para o motor.
import { t } from '../mensagens/t'
import type { Chamada, ChamadaFrom, Operador, RespostaCliente } from '../motor/chamada'

export type Enviar = (chamada: Chamada) => Promise<RespostaCliente>

const SILENCIOSAS = new Set(['then', 'catch', 'finally', 'toJSON', 'constructor', 'valueOf', 'toString'])

/** Qualquer método que o jogo não tem responde com uma mensagem clara, em vez de "is not a function". */
function comAviso<T extends object>(alvo: T, onde: string): T {
  return new Proxy(alvo, {
    get(obj, prop, receptor) {
      if (typeof prop === 'symbol' || prop in obj || SILENCIOSAS.has(prop)) return Reflect.get(obj, prop, receptor)
      return () => {
        throw new Error(t('cliente.metodoAindaNao', { onde, metodo: prop }))
      }
    },
  })
}

class Consulta implements PromiseLike<RespostaCliente> {
  private readonly c: ChamadaFrom

  constructor(
    private readonly enviar: Enviar,
    tabela: string,
  ) {
    this.c = { tipo: 'from', tabela, operacao: null, filtros: [] }
  }

  /** Lê linhas. Depois de insert/update/delete, pede as linhas afetadas de volta. */
  select(colunas = '*', opcoes?: unknown): this {
    if (opcoes !== undefined) throw new Error(t('cliente.opcoesDoSelect'))
    if (this.c.operacao === null) {
      this.c.operacao = 'select'
      this.c.colunas = colunas
    } else {
      this.c.retornar = colunas
    }
    return this
  }

  insert(valores: Record<string, unknown> | Record<string, unknown>[]): this {
    return this.escrever('insert', valores)
  }

  update(valores: Record<string, unknown>): this {
    return this.escrever('update', valores)
  }

  delete(): this {
    return this.escrever('delete')
  }

  eq(coluna: string, valor: unknown): this { return this.filtrar('eq', coluna, valor) }
  neq(coluna: string, valor: unknown): this { return this.filtrar('neq', coluna, valor) }
  gt(coluna: string, valor: unknown): this { return this.filtrar('gt', coluna, valor) }
  gte(coluna: string, valor: unknown): this { return this.filtrar('gte', coluna, valor) }
  lt(coluna: string, valor: unknown): this { return this.filtrar('lt', coluna, valor) }
  lte(coluna: string, valor: unknown): this { return this.filtrar('lte', coluna, valor) }
  like(coluna: string, padrao: string): this { return this.filtrar('like', coluna, padrao) }
  ilike(coluna: string, padrao: string): this { return this.filtrar('ilike', coluna, padrao) }
  in(coluna: string, valores: unknown[]): this { return this.filtrar('in', coluna, valores) }
  is(coluna: string, valor: null | boolean): this { return this.filtrar('is', coluna, valor) }

  order(coluna: string, opcoes: { ascending?: boolean } = {}): this {
    ;(this.c.ordem ??= []).push({ coluna, crescente: opcoes.ascending !== false })
    return this
  }

  limit(quantas: number): this {
    this.c.limite = quantas
    return this
  }

  single(): this {
    this.c.unica = 'single'
    return this
  }

  maybeSingle(): this {
    this.c.unica = 'maybeSingle'
    return this
  }

  /** É o `await` que dispara a chamada, como no supabase-js. */
  then<A = RespostaCliente, B = never>(
    resolvido?: ((valor: RespostaCliente) => A | PromiseLike<A>) | null,
    rejeitado?: ((motivo: unknown) => B | PromiseLike<B>) | null,
  ): Promise<A | B> {
    return this.enviar(structuredClone(this.c)).then(resolvido, rejeitado)
  }

  private escrever(operacao: 'insert' | 'update' | 'delete', valores?: unknown): this {
    if (this.c.operacao !== null) throw new Error(t('cliente.consultaJaTemOperacao', { operacao: this.c.operacao }))
    this.c.operacao = operacao
    if (valores !== undefined) this.c.valores = valores
    return this
  }

  private filtrar(op: Operador, coluna: string, valor: unknown): this {
    this.c.filtros.push({ coluna, op, valor })
    return this
  }
}

export interface Supabase {
  from(tabela: string): Consulta
  rpc(nome: string, args?: Record<string, unknown>): Promise<RespostaCliente>
  auth: {
    signUp(credenciais: { email: string; password: string; options?: { data?: Record<string, unknown> } }): Promise<RespostaCliente>
    signInWithPassword(credenciais: { email: string; password: string }): Promise<RespostaCliente>
    updateUser(atributos: { data?: Record<string, unknown> }): Promise<RespostaCliente>
    getUser(): Promise<RespostaCliente>
    signOut(): Promise<RespostaCliente>
  }
}

export function criarSupabase(enviar: Enviar): Supabase {
  const auth: Supabase['auth'] = {
    signUp: (c) => enviar({ tipo: 'auth', metodo: 'signUp', email: c?.email, senha: c?.password, dados: c?.options?.data }),
    signInWithPassword: (c) => enviar({ tipo: 'auth', metodo: 'signInWithPassword', email: c?.email, senha: c?.password }),
    updateUser: (a) => {
      const outros = Object.keys(a ?? {}).filter((k) => k !== 'data')
      if (outros.length) throw new Error(t('cliente.updateUserSoData', { campos: outros.join(', ') }))
      return enviar({ tipo: 'auth', metodo: 'updateUser', dados: a?.data })
    },
    getUser: () => enviar({ tipo: 'auth', metodo: 'getUser' }),
    signOut: () => enviar({ tipo: 'auth', metodo: 'signOut' }),
  }
  return comAviso(
    {
      from: (tabela: string) => comAviso(new Consulta(enviar, tabela), 'supabase.from()'),
      rpc: (nome: string, args: Record<string, unknown> = {}) => enviar({ tipo: 'rpc', nome, args }),
      auth: comAviso(auth, 'supabase.auth'),
    },
    'supabase',
  )
}

/** O ataque de referência de uma fase: código de verdade contra o cliente falso. */
/** O segundo argumento só importa nas fases de descobrir: é por ele que o ataque informa o valor deduzido. */
export type Ataque = (supabase: Supabase, responder: (valor: string) => Promise<void>) => Promise<void>

export function definirAtaque(ataque: Ataque): Ataque {
  return ataque
}
