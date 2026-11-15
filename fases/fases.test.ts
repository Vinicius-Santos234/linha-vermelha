// D9: toda fase é testada. A versão furada TEM que cair no ataque de referência, e o
// conserto de referência TEM que passar na bateria inteira.
import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { criarSupabase } from '../cliente/supabase'
import { abrirFase, criarBase, Partida, testarDefesa, type Chamada, type Snapshot } from '../motor'
import { baseSql, fases, type FaseComReferencia } from './carregar.node'

let base: Snapshot
beforeAll(async () => {
  base = await criarBase(baseSql)
})

const falhas = (r: Awaited<ReturnType<typeof testarDefesa>>) =>
  r.testes.filter((t) => !t.ok).map((t) => `[${t.tipo}] ${t.nome}: ${t.detalhe}`)

/** Joga o ataque de referência na versão furada, na sessão do jogador, e devolve o que foi gravado. */
async function gravarAtaque(f: FaseComReferencia): Promise<{ venceu: boolean; chamadas: Chamada[] }> {
  const sessao = await abrirFase(base, f, { sessao: 'jogador' })
  try {
    const partida = new Partida(sessao)
    await f.ataque!(criarSupabase((c) => partida.chamar(c)), async (valor) => void (await partida.chamar({ tipo: 'resposta', valor })))
    return { venceu: partida.venceu, chamadas: partida.historico }
  } finally {
    await sessao.fechar()
  }
}

it('existe pelo menos uma fase', () => {
  expect(fases.length).toBeGreaterThan(0)
})

describe.each(fases)('fase $def.id', (f) => {
  let gravado: Awaited<ReturnType<typeof gravarAtaque>>
  beforeAll(async () => {
    gravado = await gravarAtaque(f)
  })

  it('o pacote está completo e coerente', () => {
    expect(f.def.id).toBe(f.pasta)
    expect(f.setupSql).not.toBe('')
    expect(f.politicasSql, 'falta o politicas.sql').not.toBe('')
    expect(f.ataque, 'falta o ataque.ts').toBeTypeOf('function')
    expect(f.solucaoSql, 'falta o solucao.sql').toBeTruthy()
    expect(Object.values(f.def.usuarios)).toContain('voce')
    expect(f.def.gabarito).toHaveProperty(f.def.objetivo.tabela)
  })

  it('o login do briefing funciona e é o do usuário "voce"', async () => {
    const sessao = await abrirFase(base, f, { sessao: 'jogador' })
    try {
      const partida = new Partida(sessao)
      const supabase = criarSupabase((c) => partida.chamar(c))
      const { error } = await supabase.auth.signInWithPassword({ email: f.def.acesso.email, password: f.def.acesso.senha })
      expect(error).toBeNull()
      expect(f.def.usuarios[partida.usuario.nome]).toBe('voce')
    } finally {
      await sessao.fechar()
    }
  })

  // O site não leva o ataque.ts: leva as chamadas gravadas, que a bateria da Defesa
  // reproduz. `npm run gravar` reescreve o arquivo; aqui ele tem de estar em dia.
  it('o ataque.gravado.json está em dia com o ataque.ts', () => {
    const arquivo = fileURLToPath(new URL(`./${f.pasta}/ataque.gravado.json`, import.meta.url))
    if (process.env.GRAVAR || !existsSync(arquivo)) writeFileSync(arquivo, JSON.stringify(gravado.chamadas, null, 2) + '\n')
    else expect(f.ataqueGravado, 'rode npm run gravar').toEqual(gravado.chamadas)
  })

  it('a versão furada cai no ataque de referência, na sessão do jogador', () => {
    expect(gravado.venceu).toBe(true)
  })

  it('o ataque de referência não entra com a conta da vítima', () => {
    const vitimas = Object.entries(f.def.usuarios).filter(([, papel]) => papel === 'vitima').map(([nome]) => `${nome}@`)
    for (const c of gravado.chamadas) {
      if (c.tipo === 'auth' && c.metodo === 'signInWithPassword') {
        expect(vitimas.some((v) => String(c.email).startsWith(v)), `entrou como ${String(c.email)}`).toBe(false)
      }
    }
  })

  it('a versão furada é reprovada pela bateria, só em testes de ataque', async () => {
    const r = await testarDefesa(base, f, f.politicasSql, [{ nome: 'referência', chamadas: gravado.chamadas }])
    expect(r.passou).toBe(false)
    const reprovados = r.testes.filter((t) => !t.ok)
    expect(reprovados.map((t) => t.tipo)).not.toContain('uso')
    expect(reprovados.map((t) => t.nome)).toContain('ataque barrado: referência')
  })

  it('o conserto de referência passa na bateria inteira', async () => {
    const r = await testarDefesa(base, f, f.solucaoSql!, [{ nome: 'referência', chamadas: gravado.chamadas }])
    expect(r.erroSql).toBeUndefined()
    expect(falhas(r)).toEqual([])
    expect(r.passou).toBe(true)
    expect(r.testes.some((t) => t.tipo === 'uso')).toBe(true)
  })
})
