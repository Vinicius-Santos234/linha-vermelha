// O ano inteiro, dia por dia, contra o banco. Demora alguns minutos, então só roda
// quando pedido: npm run prova:diario
import { beforeAll, describe, expect, it } from 'vitest'
import { baseSql } from '../fases/carregar.node'
import { criarBase, testarDefesa, type Snapshot } from '../motor'
import { gerarDesafio } from './gerar'

let base: Snapshot
beforeAll(async () => {
  base = await criarBase(baseSql)
})

const DIAS = Number(process.env.DIAS ?? 365)
const ANO = Array.from({ length: DIAS }, (_, n) => new Date(Date.UTC(2027, 0, 1 + n)).toISOString().slice(0, 10))

describe.runIf(process.env.ANO)(`os ${DIAS} dias a partir de 01/01/2027`, () => {
  it.each(ANO)('%s', async (data) => {
    const d = gerarDesafio(data)
    const ataques = [{ nome: 'referência', chamadas: d.ataque }]
    const furada = await testarDefesa(base, d, d.politicasSql, ataques)
    const reprovados = furada.testes.filter((t) => !t.ok)
    expect(reprovados.map((t) => t.nome), d.familia).toContain('ataque barrado: referência')
    expect(reprovados.filter((t) => t.tipo === 'uso'), d.familia).toEqual([])
    const consertada = await testarDefesa(base, d, d.solucaoSql, ataques)
    expect(consertada.testes.filter((t) => !t.ok).map((t) => t.nome), d.familia).toEqual([])
  })
})
