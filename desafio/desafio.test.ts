// O desafio diário tem de ser sempre jogável: em toda combinação de família e cenário,
// o ataque de referência derruba a versão furada e o conserto de referência passa na
// bateria. É a mesma exigência das fases fixas (D9), aplicada ao gerador.
import { beforeAll, describe, expect, it } from 'vitest'
import { baseSql } from '../fases/carregar.node'
import { lerTexto } from '../jogo/texto'
import { criarBase, testarDefesa, type Snapshot } from '../motor'
import { CENARIOS, FAMILIAS, familiaDoDia, gerarDesafio, hoje, numeroDoDia, type Desafio } from './gerar'

let base: Snapshot
beforeAll(async () => {
  base = await criarBase(baseSql)
})

/** Uma data a partir de 01/01/2027, para percorrer um ano inteiro. */
const dia = (n: number) => new Date(Date.UTC(2027, 0, 1 + n)).toISOString().slice(0, 10)
const ANO = Array.from({ length: 365 }, (_, n) => dia(n))

async function conferir(d: Desafio) {
  const ataques = [{ nome: 'referência', chamadas: d.ataque }]
  const furada = await testarDefesa(base, d, d.politicasSql, ataques)
  const reprovados = furada.testes.filter((t) => !t.ok)
  expect(furada.erroSql, 'as políticas furadas não rodaram').toBeUndefined()
  expect(reprovados.map((t) => t.nome), 'o ataque de referência não derruba a versão furada').toContain('ataque barrado: referência')
  expect(reprovados.filter((t) => t.tipo === 'uso').map((t) => t.nome), 'a versão furada já quebra o uso legítimo').toEqual([])

  const consertada = await testarDefesa(base, d, d.solucaoSql, ataques)
  expect(consertada.erroSql, 'o conserto de referência não rodou').toBeUndefined()
  expect(consertada.testes.filter((t) => !t.ok).map((t) => `[${t.tipo}] ${t.nome}: ${t.detalhe}`)).toEqual([])
  expect(consertada.testes.some((t) => t.tipo === 'uso')).toBe(true)
}

describe('o sorteio', () => {
  it('o mesmo dia dá sempre o mesmo desafio', () => {
    const a = gerarDesafio('2027-03-14')
    const b = gerarDesafio('2027-03-14')
    expect({ ...a, def: null }).toEqual({ ...b, def: null })
    expect(gerarDesafio('2027-03-15').setupSql).not.toBe(a.setupSql)
  })

  it('num ano, toda família e todo cenário aparecem, e nenhuma família se repete em dias seguidos', () => {
    const familias = ANO.map(familiaDoDia)
    expect(new Set(familias).size).toBe(FAMILIAS.length)
    expect(familias.filter((f, i) => i > 0 && f === familias[i - 1])).toEqual([])
    expect(new Set(ANO.map((d) => gerarDesafio(d).cenario.id)).size).toBe(CENARIOS.length)
    // Cada família aparece uma vez a cada oito dias, então nenhuma some por semanas.
    for (const f of FAMILIAS) expect(familias.filter((x) => x === f).length).toBeGreaterThanOrEqual(45)
  })

  it('todo dia do ano gera uma fase completa, com o alvo na tabela e três dicas por modo', () => {
    for (const data of ANO) {
      const d = gerarDesafio(data)
      const t = lerTexto(d.texto)
      expect(d.id).toBe(`diario-${data}`)
      expect([t.titulo, t.resumo, t.briefingDoAtaque, t.briefingDaDefesa, t.explicacao].every((s) => s.length > 10), data).toBe(true)
      expect([t.dicasDoAtaque.length, t.dicasDaDefesa.length], data).toEqual([3, 3])
      expect(d.texto, data).not.toMatch(/\{\w+\}/)
      const objetivo = d.def.objetivo
      expect(objetivo.tipo === 'ler' && d.setupSql.includes(`(${objetivo.id}, `), data).toBe(true)
      expect(d.def.gabarito, data).toHaveProperty(objetivo.tabela)
      expect(d.ataque.length, data).toBeGreaterThan(0)
    }
  })

  it('a data de hoje sai no fuso de quem joga, e os dias contam a partir de 2026', () => {
    expect(hoje(new Date(2027, 1, 3, 23, 59))).toBe('2027-02-03')
    expect(numeroDoDia('2026-01-01')).toBe(0)
    expect(numeroDoDia('2027-01-01')).toBe(365)
  })
})

describe.each(FAMILIAS)('família %s', (familia) => {
  it.each(CENARIOS.map((c) => c.id))('no cenário %s: o ataque derruba a furada e o conserto passa', async (cenario) => {
    await conferir(gerarDesafio('2027-06-15', { familia, cenario }))
  })
})

describe('dias de verdade', () => {
  // Uma amostra de dias corridos, como o jogo os gera. O ano inteiro roda em `npm run prova:diario`.
  it.each(ANO.slice(0, 16))('%s', async (data) => {
    await conferir(gerarDesafio(data))
  })
})
