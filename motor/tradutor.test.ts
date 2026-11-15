import { describe, expect, it } from 'vitest'
import type { ChamadaFrom } from './chamada'
import { traduzirFrom, traduzirRpc, traduzirSombra } from './tradutor'

const de = (c: Partial<ChamadaFrom>): ChamadaFrom => ({ tipo: 'from', tabela: 'pedidos', operacao: 'select', filtros: [], ...c })

describe('tradutor supabase-js → SQL', () => {
  it('select com filtros, ordem e limite, tudo por parâmetro', () => {
    const c = de({
      colunas: 'id, itens',
      filtros: [
        { coluna: 'total', op: 'gte', valor: 10 },
        { coluna: 'status', op: 'in', valor: ['recebido', 'pronto'] },
        { coluna: 'user_id', op: 'is', valor: null },
        { coluna: 'itens', op: 'ilike', valor: '%bolo%' },
      ],
      ordem: [{ coluna: 'id', crescente: false }],
      limite: 5,
    })
    expect(traduzirFrom(c)).toEqual({
      sql: 'select "id", "itens" from public."pedidos" where "total" >= $1 and "status" in ($2, $3) and "user_id" is null and "itens" ilike $4 order by "id" desc limit 5',
      params: [10, 'recebido', 'pronto', '%bolo%'],
    })
  })

  it('a sombra repete filtro, ordem e limite, pedindo só a chave', () => {
    const c = de({ colunas: 'itens', filtros: [{ coluna: 'id', op: 'eq', valor: 7 }], limite: 1 })
    expect(traduzirSombra(c, 'id')).toEqual({ sql: 'select "id" as chave from public."pedidos" where "id" = $1 limit 1', params: [7] })
  })

  it('insert de várias linhas usa default no que faltar', () => {
    const c = de({ operacao: 'insert', valores: [{ id: 1, itens: 'a' }, { id: 2 }], retornar: '*' })
    expect(traduzirFrom(c)).toEqual({
      sql: 'insert into public."pedidos" ("id", "itens") values ($1, $2), ($3, default) returning *',
      params: [1, 'a', 2],
    })
  })

  it('update e delete', () => {
    const filtros = [{ coluna: 'id', op: 'eq' as const, valor: 7 }]
    expect(traduzirFrom(de({ operacao: 'update', valores: { status: 'cancelado' }, filtros }))).toEqual({
      sql: 'update public."pedidos" set "status" = $1 where "id" = $2',
      params: ['cancelado', 7],
    })
    expect(traduzirFrom(de({ operacao: 'delete', filtros, retornar: 'id' }))).toEqual({
      sql: 'delete from public."pedidos" where "id" = $1 returning "id"',
      params: [7],
    })
  })

  it('update e delete sem filtro são recusados, como no Supabase', () => {
    expect(() => traduzirFrom(de({ operacao: 'update', valores: { status: 'x' } }))).toThrow('UPDATE requires a WHERE clause')
    expect(() => traduzirFrom(de({ operacao: 'delete' }))).toThrow('DELETE requires a WHERE clause')
  })

  it('.in() vazio não casa com nada', () => {
    expect(traduzirFrom(de({ filtros: [{ coluna: 'id', op: 'in', valor: [] }] })).sql).toBe('select * from public."pedidos" where false')
  })

  it('rpc com argumentos nomeados', () => {
    expect(traduzirRpc({ tipo: 'rpc', nome: 'pedidos_acima_de', args: { minimo: 10 } })).toEqual({
      sql: 'select * from public."pedidos_acima_de"("minimo" := $1)',
      params: [10],
    })
  })

  it.each([
    ['tabela com schema', de({ tabela: 'auth.users' })],
    ['tabela com SQL', de({ tabela: 'pedidos; drop table pedidos' })],
    ['tabela com aspas', de({ tabela: 'pedidos" where true --' })],
    ['coluna de filtro com SQL', de({ filtros: [{ coluna: 'id = 1 or true', op: 'eq', valor: 1 }] })],
    ['operador inventado', de({ filtros: [{ coluna: 'id', op: '= 1 or true --' as never, valor: 1 }] })],
    ['coluna de ordem com SQL', de({ ordem: [{ coluna: 'id; select 1', crescente: true }] })],
    ['limite que não é número', de({ limite: '1; drop table pedidos' as never })],
    ['colunas com subconsulta', de({ colunas: '(select senha from auth.users limit 1)' })],
    ['colunas com função', de({ colunas: 'current_user' + '()' })],
    ['chave de insert com SQL', de({ operacao: 'insert', valores: { 'id) values (1); --': 1 } })],
    ['retorno com subconsulta', de({ operacao: 'delete', filtros: [{ coluna: 'id', op: 'eq', valor: 1 }], retornar: '(select 1)' })],
    ['operação inventada', de({ operacao: 'truncate' as never })],
  ])('recusa %s', (_, chamada) => {
    expect(() => traduzirFrom(chamada)).toThrow()
  })

  it('recusa nome de função e de argumento com SQL', () => {
    expect(() => traduzirRpc({ tipo: 'rpc', nome: 'pg_catalog.set_config', args: {} })).toThrow()
    expect(() => traduzirRpc({ tipo: 'rpc', nome: 'f', args: { 'a := 1); --': 1 } })).toThrow()
  })
})
