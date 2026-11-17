// O inglês tem de ser o mesmo jogo: as mesmas chaves, as mesmas seções, o mesmo código
// nas dicas. Uma tradução que esquece um texto ou muda um ataque não passa daqui.
import { afterEach, describe, expect, it } from 'vitest'
import { FAMILIAS, CENARIOS, gerarDesafio } from '../desafio/gerar'
import en from '../mensagens/en.json'
import ptBR from '../mensagens/pt-BR.json'
import { definirIdioma, t, tSeHouver } from '../mensagens/t'
import { lerTexto } from './texto'

const emPt = import.meta.glob<string>('../fases/*/pt-BR.md', { query: '?raw', import: 'default', eager: true })
const emEn = import.meta.glob<string>('../fases/*/en.md', { query: '?raw', import: 'default', eager: true })
const ajudas = import.meta.glob<string>('../mensagens/ajuda.*.md', { query: '?raw', import: 'default', eager: true })

const marcadores = (texto: string) => [...texto.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort()
const blocos = (texto: string) => [...texto.replace(/\r\n/g, '\n').matchAll(/```(\w*)\n([\s\S]*?)```/g)].map((m) => `${m[1]}\n${m[2]}`)
// O único trecho de código que muda de idioma: o texto que o ataque da fase 11 imprime.
const semTextoImpresso = (codigo: string) => codigo.replace("'já existe:'", "'…'").replace("'already exists:'", "'…'")

afterEach(() => definirIdioma('pt-BR'))

describe('mensagens', () => {
  it('o inglês tem exatamente as chaves do português', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ptBR).sort())
  })

  it('e cada texto usa os mesmos marcadores', () => {
    for (const chave of Object.keys(ptBR) as (keyof typeof ptBR)[]) {
      expect(marcadores(en[chave]), chave).toEqual(marcadores(ptBR[chave]))
      expect(en[chave].trim(), chave).not.toBe('')
    }
  })

  it('t() responde no idioma escolhido', () => {
    expect(t('vitoria.ataque')).toBe('Você cruzou a linha')
    definirIdioma('en')
    expect(t('vitoria.ataque')).toBe('You crossed the line')
    expect(t('dicas.abrir', { n: 2 })).toBe('Open hint 2')
    expect(tSeHouver('uso.relatorio')).toBe("alice's report still returns her orders")
    expect(tSeHouver('um texto qualquer')).toBe('um texto qualquer')
  })
})

describe('fases em inglês', () => {
  const pastas = Object.keys(emPt).map((caminho) => caminho.slice(0, caminho.lastIndexOf('/')))

  it('toda fase tem o en.md', () => {
    expect(pastas.length).toBe(13)
    for (const pasta of pastas) expect(emEn[`${pasta}/en.md`], pasta).toBeTruthy()
  })

  it.each(pastas)('%s: mesmas seções, três dicas por modo e o mesmo código', (pasta) => {
    const pt = lerTexto(emPt[`${pasta}/pt-BR.md`]!)
    const ingles = lerTexto(emEn[`${pasta}/en.md`]!)
    for (const campo of ['titulo', 'resumo', 'briefingDoAtaque', 'briefingDaDefesa', 'explicacao'] as const) {
      expect(ingles[campo], campo).not.toBe('')
      expect(ingles[campo], campo).not.toBe(pt[campo])
    }
    expect(ingles.dicasDoAtaque).toHaveLength(3)
    expect(ingles.dicasDaDefesa).toHaveLength(3)
    // O número do alvo e o código das dicas são os da fase, em qualquer idioma.
    expect(ingles.briefingDoAtaque.match(/#\d+/g)).toEqual(pt.briefingDoAtaque.match(/#\d+/g))
    expect(blocos(emEn[`${pasta}/en.md`]!).map(semTextoImpresso)).toEqual(blocos(emPt[`${pasta}/pt-BR.md`]!).map(semTextoImpresso))
  })

  it('a ajuda tem as mesmas dez seções e o mesmo código', () => {
    const pt = ajudas['../mensagens/ajuda.pt-BR.md']!
    const ingles = ajudas['../mensagens/ajuda.en.md']!
    expect(ingles.match(/^## /gm)).toHaveLength(10)
    expect(pt.match(/^## /gm)).toHaveLength(10)
    expect(blocos(ingles)).toEqual(blocos(pt))
  })
})

describe('desafio diário em inglês', () => {
  it('toda família e todo cenário geram um texto completo, sem marcador sobrando', () => {
    definirIdioma('en')
    for (const familia of FAMILIAS) {
      for (const cenario of CENARIOS) {
        const d = gerarDesafio('2026-11-16', { familia, cenario: cenario.id })
        const texto = lerTexto(d.texto)
        const onde = `${familia} · ${cenario.id}`
        expect(texto.titulo, onde).toBe('Challenge for Nov 16')
        expect(texto.briefingDoAtaque, onde).toContain('**Goal:**')
        expect(texto.briefingDaDefesa, onde).toContain('without breaking the app')
        expect(texto.dicasDoAtaque, onde).toHaveLength(3)
        expect(texto.dicasDaDefesa, onde).toHaveLength(3)
        expect(texto.explicacao, onde).not.toBe('')
        expect(d.texto, onde).not.toMatch(/\{\w+\}|undefined/)
      }
    }
  })

  it('o idioma só muda o texto: a fase gerada é a mesma', () => {
    const pt = gerarDesafio('2026-03-09')
    definirIdioma('en')
    const ingles = gerarDesafio('2026-03-09')
    expect(ingles.setupSql).toBe(pt.setupSql)
    expect(ingles.politicasSql).toBe(pt.politicasSql)
    expect(ingles.solucaoSql).toBe(pt.solucaoSql)
    expect(ingles.ataque).toEqual(pt.ataque)
    expect(lerTexto(pt.texto).titulo).toBe('Desafio de 09/03')
    expect(blocos(ingles.texto)).toEqual(blocos(pt.texto))
  })
})
