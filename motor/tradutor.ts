// Tradutor supabase-js → SQL parametrizado. Faz o papel do PostgREST: só enxerga o
// schema public, e todo valor do jogador vai por parâmetro, nunca colado no SQL.
import { t, type Chave } from '../mensagens/t'
import { aindaNao, ErroDeChamada, OPERADORES, type ChamadaFrom, type ChamadaRpc, type Filtro } from './chamada'
import { ident, tabelaPublica } from './sql'

export interface Consulta {
  sql: string
  params: unknown[]
}

const NOME = /^[A-Za-z_][A-Za-z0-9_]*$/
const invalida = (chave: Chave, valores: Record<string, string | number> = {}) => new ErroDeChamada(t(chave, valores), 'JOGO_CHAMADA_INVALIDA')

function nome(valor: unknown, oQue: Chave): string {
  if (typeof valor !== 'string' || !NOME.test(valor)) throw invalida('tradutor.nomeInvalido', { oQue: t(oQue), valor: JSON.stringify(valor) ?? 'undefined' })
  return ident(valor)
}

function colunas(lista: unknown): string {
  if (lista === undefined || lista === '*') return '*'
  if (typeof lista !== 'string') throw invalida('tradutor.colunasTexto')
  const partes = lista.split(',').map((p) => p.trim())
  if (partes.some((p) => p !== '*' && !NOME.test(p))) throw aindaNao(t('tradutor.selectEmbutido', { lista }))
  return partes.map((p) => (p === '*' ? '*' : ident(p))).join(', ')
}

const SIMBOLO: Record<string, string> = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'like', ilike: 'ilike' }

function onde(filtros: unknown, params: unknown[]): string {
  if (!Array.isArray(filtros)) throw invalida('tradutor.filtrosInvalidos')
  const partes = (filtros as Filtro[]).map((f) => {
    const coluna = nome(f?.coluna, 'tradutor.coluna')
    if (!OPERADORES.includes(f.op)) throw aindaNao(t('tradutor.filtro', { op: String(f.op) }))
    if (f.op === 'is') {
      if (f.valor === null) return `${coluna} is null`
      if (f.valor === true || f.valor === false) return `${coluna} is ${f.valor}`
      throw invalida('tradutor.isSo')
    }
    if (f.op === 'in') {
      if (!Array.isArray(f.valor)) throw invalida('tradutor.inLista')
      if (f.valor.length === 0) return 'false'
      return `${coluna} in (${f.valor.map((v) => parametro(v, params)).join(', ')})`
    }
    return `${coluna} ${SIMBOLO[f.op]} ${parametro(f.valor, params)}`
  })
  return partes.length ? ` where ${partes.join(' and ')}` : ''
}

function parametro(valor: unknown, params: unknown[]): string {
  if (valor === undefined) throw invalida('tradutor.valorUndefined')
  params.push(valor)
  return `$${params.length}`
}

function finais(c: ChamadaFrom): string {
  let sql = ''
  if (c.ordem?.length) {
    sql += ` order by ${c.ordem.map((o) => `${nome(o?.coluna, 'tradutor.coluna')} ${o.crescente === false ? 'desc' : 'asc'}`).join(', ')}`
  }
  if (c.limite !== undefined) {
    if (!Number.isInteger(c.limite) || c.limite < 0) throw invalida('tradutor.limite')
    sql += ` limit ${c.limite}`
  }
  return sql
}

const devolver = (c: ChamadaFrom) => (c.retornar === undefined ? '' : ` returning ${colunas(c.retornar)}`)

function objeto(valor: unknown, oQue: string): Record<string, unknown> {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) throw invalida('tradutor.objeto', { oQue })
  return valor as Record<string, unknown>
}

export function traduzirFrom(c: ChamadaFrom): Consulta {
  const tabela = `public.${nome(c.tabela, 'tradutor.tabela')}`
  const params: unknown[] = []
  switch (c.operacao) {
    case 'select':
      return { sql: `select ${colunas(c.colunas)} from ${tabela}${onde(c.filtros, params)}${finais(c)}`, params }

    case 'insert': {
      const linhas = (Array.isArray(c.valores) ? c.valores : [c.valores]).map((l) => objeto(l, '.insert()'))
      const chaves = [...new Set(linhas.flatMap((l) => Object.keys(l)))]
      if (!linhas.length || !chaves.length) throw invalida('tradutor.insertVazio')
      const valores = linhas.map((l) => `(${chaves.map((k) => (k in l ? parametro(l[k], params) : 'default')).join(', ')})`)
      const cols = chaves.map((k) => nome(k, 'tradutor.coluna')).join(', ')
      return { sql: `insert into ${tabela} (${cols}) values ${valores.join(', ')}${devolver(c)}`, params }
    }

    case 'update': {
      const valores = objeto(c.valores, '.update()')
      const atribuicoes = Object.keys(valores).map((k) => `${nome(k, 'tradutor.coluna')} = ${parametro(valores[k], params)}`)
      if (!atribuicoes.length) throw invalida('tradutor.updateVazio')
      // Igual ao Supabase de verdade, na mensagem inclusive: UPDATE e DELETE sem filtro são recusados.
      if (!c.filtros?.length) throw new ErroDeChamada('UPDATE requires a WHERE clause', '21000')
      return { sql: `update ${tabela} set ${atribuicoes.join(', ')}${onde(c.filtros, params)}${devolver(c)}`, params }
    }

    case 'delete':
      if (!c.filtros?.length) throw new ErroDeChamada('DELETE requires a WHERE clause', '21000')
      return { sql: `delete from ${tabela}${onde(c.filtros, params)}${devolver(c)}`, params }

    default:
      throw invalida('tradutor.faltouOperacao')
  }
}

/**
 * O mesmo select, mas pedindo só a chave. É como o detector de objetivo sabe quais linhas
 * a resposta trouxe, mesmo quando o jogador não pediu a coluna da chave.
 */
export function traduzirSombra(c: ChamadaFrom, chave: string): Consulta {
  const params: unknown[] = []
  return { sql: `select ${ident(chave)} as chave from ${tabelaPublica(c.tabela)}${onde(c.filtros, params)}${finais(c)}`, params }
}

export function traduzirRpc(c: ChamadaRpc): Consulta {
  const params: unknown[] = []
  const args = Object.entries(objeto(c.args ?? {}, '.rpc()')).map(([k, v]) => `${nome(k, 'tradutor.argumento')} := ${parametro(v, params)}`)
  return { sql: `select * from public.${nome(c.nome, 'tradutor.funcao')}(${args.join(', ')})`, params }
}
