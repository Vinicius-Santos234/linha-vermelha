import { beforeAll, describe, expect, it } from 'vitest'
import { baseSql, fase } from '../fases/carregar.node'
import { criarBase, explorar, type Snapshot } from './index'

let base: Snapshot
beforeAll(async () => {
  base = await criarBase(baseSql)
})

const fase1 = fase('01-rls-desligado')
const fase5 = fase('05-metadata-do-usuario')

describe('laboratório', () => {
  it('mostra o que cada usuário enxerga, sem gabarito', async () => {
    const r = await explorar(base, `${fase1.setupSql}\n${fase1.solucaoSql}`)
    expect(r.erroSql).toBeNull()
    expect(r.usuarios).toEqual(['alice', 'bruno', 'anon'])
    const [pedidos] = r.tabelas
    expect(pedidos).toMatchObject({ nome: 'pedidos', rlsLigado: true, colunas: ['id', 'user_id', 'itens', 'endereco', 'total', 'status'] })
    expect(pedidos!.linhas.map((l) => l.id)).toEqual([1, 2, 5, 7])
    expect(pedidos!.visiveis).toEqual({ alice: [0, 1], bruno: [2, 3], anon: [] })
  })

  it('com o RLS desligado, todo mundo vê tudo', async () => {
    const r = await explorar(base, fase1.setupSql)
    expect(r.tabelas[0]).toMatchObject({ rlsLigado: false, visiveis: { alice: [0, 1, 2, 3], bruno: [0, 1, 2, 3], anon: [0, 1, 2, 3] } })
  })

  it('usa os claims de cada usuário, inclusive o metadata', async () => {
    const r = await explorar(base, `${fase5.setupSql}\n${fase5.politicasSql}`)
    expect(r.tabelas[0]!.visiveis).toEqual({ alice: [0, 1], bruno: [2, 3], carla: [0, 1, 2, 3], anon: [] })
  })

  it('funciona em tabela sem chave primária e em banco sem tabela', async () => {
    const semChave = await explorar(base, `create table public.t (x text); insert into public.t values ('a'), ('b');`)
    expect(semChave.tabelas[0]).toMatchObject({ colunas: ['x'], linhas: [{ x: 'a' }, { x: 'b' }], visiveis: { anon: [0, 1] } })
    expect(await explorar(base, '-- nada')).toEqual({ erroSql: null, usuarios: ['anon'], tabelas: [] })
  })

  it('SQL inválido volta como erro', async () => {
    const r = await explorar(base, 'create tabel x ()')
    expect(r.erroSql?.code).toBe('42601')
    expect(r.tabelas).toEqual([])
  })
})
