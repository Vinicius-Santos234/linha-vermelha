import { describe, expect, it } from 'vitest'
import { estrelasPara, mesclar, patente, sequencia, totalDeEstrelas, type Conquista } from './progresso'

const c = (estrelas: number, quando = '2026-11-15T00:00:00.000Z'): Conquista => ({ estrelas, dicas: 3 - estrelas, concluidaEm: quando })

describe('progresso', () => {
  it('cada dica tira uma estrela, com mínimo de uma', () => {
    expect([0, 1, 2, 3, 9].map(estrelasPara)).toEqual([3, 2, 1, 1, 1])
  })

  it('mesclar fica com o máximo de estrelas por fase e modo', () => {
    const celular = { f1: { ataque: c(3), defesa: c(1) }, f4: { ataque: c(2) } }
    const computador = { f1: { ataque: c(1), defesa: c(2), ciclo: c(3) }, f5: { defesa: c(1) } }
    const junto = { f1: { ataque: c(3), defesa: c(2), ciclo: c(3) }, f4: { ataque: c(2) }, f5: { defesa: c(1) } }
    expect(mesclar(celular, computador)).toEqual(junto)
    expect(mesclar(computador, celular)).toEqual(junto)
  })

  it('no empate, fica a conquista que já estava', () => {
    const antiga = { f1: { ataque: c(3, '2026-11-01T00:00:00.000Z') } }
    const nova = { f1: { ataque: c(3, '2026-11-15T00:00:00.000Z') } }
    expect(mesclar(antiga, nova)).toEqual(antiga)
  })

  it('soma as estrelas de todas as fases e modos', () => {
    expect(totalDeEstrelas({})).toBe(0)
    expect(totalDeEstrelas({ f1: { ataque: c(3), defesa: c(1) }, f4: { ciclo: c(2) } })).toBe(6)
  })

  it('as estrelas do desafio diário não entram no total da campanha', () => {
    expect(totalDeEstrelas({ f1: { ataque: c(3) }, 'diario-2027-01-05': { ciclo: c(3) } })).toBe(3)
  })

  it('a sequência conta os dias seguidos, e não zera antes de o dia acabar', () => {
    const p = { 'diario-2027-03-01': { ataque: c(3) }, 'diario-2027-02-28': { ciclo: c(1) }, 'diario-2027-02-27': { defesa: c(2) }, 'diario-2027-02-25': { ataque: c(3) } }
    expect(sequencia(p, '2027-03-01')).toBe(3)
    expect(sequencia(p, '2027-03-02')).toBe(3)
    expect(sequencia(p, '2027-03-03')).toBe(0)
    expect(sequencia({}, '2027-03-01')).toBe(0)
  })

  it('a patente sobe com as estrelas, e a última só vem com todas', () => {
    expect([0, 1, 8, 9, 17, 18, 26, 27].map((n) => patente(n, 27))).toEqual([
      'patente.0', 'patente.1', 'patente.1', 'patente.2', 'patente.2', 'patente.3', 'patente.3', 'patente.4',
    ])
  })

  it('mesclar com vazio não muda nada', () => {
    const p = { f1: { ataque: c(2) } }
    expect(mesclar(p, {})).toEqual(p)
    expect(mesclar({}, p)).toEqual(p)
    expect(mesclar({}, {})).toEqual({})
  })
})
