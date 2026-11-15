// O cliente falso de ponta a ponta: código do jogador → cliente → partida → PGlite.
import { beforeAll, describe, expect, it } from 'vitest'
import { baseSql, fase } from '../fases/carregar.node'
import { abrirFase, criarBase, Partida, reproduzirAtaque, type Fase, type OpcoesDeFase, type Snapshot } from '../motor'
import { executarCodigo } from './executar-codigo'
import { criarSupabase, type Supabase } from './supabase'

const fase1 = fase('01-rls-desligado')
const ALICE = 'a11ce000-0000-4000-8000-000000000001'
const BRUNO = 'b0b00000-0000-4000-8000-000000000002'
const alice = { email: 'alice@exemplo.com', password: 'paodequeijo' }

// Uma fase de teste no molde da fase 5: a política confia no user_metadata, que o próprio
// usuário edita. Também traz duas funções para o rpc.
const metadata: Fase = {
  def: { ...fase1.def, id: 'teste-metadata' },
  politicasSql: '',
  setupSql: `${fase1.setupSql}
    alter table public.pedidos enable row level security;
    create policy dono on public.pedidos for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    create policy gerente_ve_tudo on public.pedidos for select to authenticated
      using (auth.jwt() -> 'user_metadata' ->> 'papel' = 'gerente');
    create function public.total_de_pedidos() returns int language sql stable
      as $$ select count(*)::int from public.pedidos $$;
    create function public.pedidos_acima_de(minimo numeric) returns setof public.pedidos language sql stable
      as $$ select * from public.pedidos where total >= minimo order by id $$;
  `,
}
const cancelar: Fase = {
  ...fase1,
  def: { ...fase1.def, objetivo: { tipo: 'alterar', tabela: 'pedidos', id: 7, campo: 'status', valor: 'cancelado' } },
}

let base: Snapshot
beforeAll(async () => {
  base = await criarBase(baseSql)
})

async function jogo<T>(f: Fase, opcoes: OpcoesDeFase, fn: (supabase: Supabase, partida: Partida) => Promise<T>): Promise<T> {
  const sessao = await abrirFase(base, f, { sessao: 'jogador', ...opcoes })
  try {
    const partida = new Partida(sessao)
    return await fn(criarSupabase((c) => partida.chamar(c)), partida)
  } finally {
    await sessao.fechar()
  }
}
const ids = (r: { data: unknown }) => (r.data as { id: number }[]).map((l) => l.id)

describe('fase 1 furada', () => {
  it('sem login, o select traz tudo e a partida é vencida', () =>
    jogo(fase1, {}, async (supabase, partida) => {
      const r = await supabase.from('pedidos').select()
      expect(r.error).toBeNull()
      expect(ids(r)).toEqual([1, 2, 5, 7])
      expect(partida.venceu).toBe(true)
    }))

  it('vence mesmo sem pedir a coluna da chave', () =>
    jogo(fase1, {}, async (supabase, partida) => {
      const r = await supabase.from('pedidos').select('itens').eq('id', 7).single()
      expect(r.data).toEqual({ itens: '1 torta de limão (surpresa de aniversário)' })
      expect(partida.venceu).toBe(true)
    }))

  it('não vence se a linha-alvo não veio, nem se a resposta deu erro', () =>
    jogo(fase1, {}, async (supabase, partida) => {
      await supabase.from('pedidos').select().lt('id', 7)
      await supabase.from('pedidos').select().order('id').limit(3)
      const varias = await supabase.from('pedidos').select().gte('id', 5).single()
      expect(varias.error?.code).toBe('PGRST116')
      expect(partida.venceu).toBe(false)
    }))

  it('objetivo de alterar: vence quando o banco fica no estado pedido', () =>
    jogo(cancelar, {}, async (supabase, partida) => {
      await supabase.from('pedidos').select()
      expect(partida.venceu).toBe(false)
      const r = await supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', 7)
      expect(r).toEqual({ data: null, error: null })
      expect(partida.venceu).toBe(true)
    }, ))
})

describe('auth', () => {
  it('entrar, ver quem sou e sair', () =>
    jogo(fase1, { sqlDoJogador: fase1.solucaoSql }, async (supabase, partida) => {
      expect((await supabase.auth.getUser()).error?.message).toBe('Auth session missing!')
      expect(ids(await supabase.from('pedidos').select())).toEqual([])

      const entrou = await supabase.auth.signInWithPassword(alice)
      expect(entrou.error).toBeNull()
      expect(entrou.data).toMatchObject({ user: { id: ALICE, email: 'alice@exemplo.com', role: 'authenticated' }, session: { access_token: expect.any(String) } })
      expect(JSON.stringify(entrou.data)).not.toContain('paodequeijo')
      expect(ids(await supabase.from('pedidos').select().order('id'))).toEqual([1, 2])
      expect((await supabase.auth.getUser()).data).toMatchObject({ user: { id: ALICE } })

      expect(await supabase.auth.signOut()).toEqual({ data: null, error: null })
      expect(partida.usuario.anonimo).toBe(true)
      expect(ids(await supabase.from('pedidos').select())).toEqual([])
      expect(partida.venceu).toBe(false)
    }))

  it('senha errada não entra, e a conta da vítima fica fora de alcance', () =>
    jogo(fase1, {}, async (supabase, partida) => {
      for (const tentativa of [
        { email: 'alice@exemplo.com', password: 'errada' },
        { email: 'bruno@exemplo.com', password: 'paodequeijo' },
        { email: 'ninguem@exemplo.com', password: 'paodequeijo' },
      ]) {
        const r = await supabase.auth.signInWithPassword(tentativa)
        expect(r.error?.code).toBe('invalid_credentials')
        expect(r.data).toEqual({ user: null, session: null })
      }
      expect(partida.usuario.anonimo).toBe(true)
    }))

  it('signUp cria a conta e já entra; e-mail repetido é recusado', () =>
    jogo(fase1, { sqlDoJogador: fase1.solucaoSql }, async (supabase, partida) => {
      const novo = await supabase.auth.signUp({ email: 'eu@padaria.com.br', password: 'segredo1', options: { data: { apelido: 'eu' } } })
      expect(novo.error).toBeNull()
      expect(novo.data).toMatchObject({ user: { email: 'eu@padaria.com.br', email_confirmed_at: null, user_metadata: { apelido: 'eu' }, app_metadata: {} } })
      expect(partida.usuario.email).toBe('eu@padaria.com.br')
      const uid = (novo.data as { user: { id: string } }).user.id
      const meu = await supabase.from('pedidos').insert({ id: 50, user_id: uid, itens: 'x', endereco: 'y', total: 1 }).select('id').single()
      expect(meu).toEqual({ data: { id: 50 }, error: null })

      expect((await supabase.auth.signUp({ email: 'alice@exemplo.com', password: 'segredo1' })).error?.code).toBe('user_already_exists')
      expect((await supabase.auth.signUp({ email: 'outro@x.com', password: '123' })).error?.code).toBe('weak_password')
      // A partida continua de pé depois dos erros.
      expect(ids(await supabase.from('pedidos').select())).toEqual([50])
    }))

  it('updateUser grava no user_metadata e já vale nos claims da próxima chamada', () =>
    jogo(metadata, {}, async (supabase, partida) => {
      expect((await supabase.auth.updateUser({ data: { papel: 'gerente' } })).error?.message).toBe('Auth session missing!')
      await supabase.auth.signInWithPassword(alice)
      expect(ids(await supabase.from('pedidos').select().order('id'))).toEqual([1, 2])
      expect(partida.venceu).toBe(false)

      const r = await supabase.auth.updateUser({ data: { papel: 'gerente' } })
      expect(r.data).toMatchObject({ user: { id: ALICE, user_metadata: { papel: 'gerente' }, app_metadata: {} } })
      expect(ids(await supabase.from('pedidos').select().order('id'))).toEqual([1, 2, 5, 7])
      expect(partida.venceu).toBe(true)
    }))

  it('updateUser não alcança o app_metadata nem outros campos', () =>
    jogo(metadata, {}, async (supabase) => {
      await supabase.auth.signInWithPassword(alice)
      const r = await supabase.auth.updateUser({ data: { app_metadata: { papel: 'gerente' } } })
      expect(r.data).toMatchObject({ user: { app_metadata: {} } })
      expect(() => supabase.auth.updateUser({ password: 'nova' } as never)).toThrow('ainda não neste jogo')
    }))
})

describe('from, com a fase consertada', () => {
  const consertada = { sqlDoJogador: fase1.solucaoSql }

  it('insert, update e delete respeitam o RLS', () =>
    jogo(fase1, consertada, async (supabase) => {
      await supabase.auth.signInWithPassword(alice)
      const novo = { id: 60, user_id: ALICE, itens: 'broa', endereco: 'Rua das Acácias, 12', total: 3 }
      expect(await supabase.from('pedidos').insert(novo)).toEqual({ data: null, error: null })
      expect((await supabase.from('pedidos').insert({ ...novo, id: 61, user_id: BRUNO })).error?.code).toBe('42501')

      const alterado = await supabase.from('pedidos').update({ status: 'pronto' }).eq('id', 60).select('id, status')
      expect(alterado.data).toEqual([{ id: 60, status: 'pronto' }])
      // No pedido do Bruno o update não dá erro: o RLS só não acha a linha.
      expect((await supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', 7).select()).data).toEqual([])

      expect((await supabase.from('pedidos').update({ status: 'x' })).error?.code).toBe('21000')
      expect((await supabase.from('pedidos').delete()).error?.code).toBe('21000')
      expect(ids(await supabase.from('pedidos').delete().eq('id', 60).select('id'))).toEqual([60])
      expect(ids(await supabase.from('pedidos').select().order('id'))).toEqual([1, 2])
    }))

  it('filtros, ordem, limite, single e maybeSingle', () =>
    jogo(fase1, {}, async (supabase) => {
      expect(ids(await supabase.from('pedidos').select('id').in('id', [1, 7, 99]).order('id', { ascending: false }))).toEqual([7, 1])
      expect(ids(await supabase.from('pedidos').select('id').like('itens', '%bolo%'))).toEqual([2])
      expect(ids(await supabase.from('pedidos').select('id').neq('user_id', ALICE).gt('total', 10))).toEqual([7])
      expect(ids(await supabase.from('pedidos').select('id').is('user_id', null))).toEqual([])
      expect(ids(await supabase.from('pedidos').select('id').order('total', { ascending: false }).limit(2))).toEqual([7, 2])
      expect((await supabase.from('pedidos').select('id').eq('id', 99).single()).error?.code).toBe('PGRST116')
      expect(await supabase.from('pedidos').select('id').eq('id', 99).maybeSingle()).toEqual({ data: null, error: null })
      expect(await supabase.from('pedidos').select('id').eq('id', 1).maybeSingle()).toEqual({ data: { id: 1 }, error: null })
    }))

  it('erros chegam em { error }, no formato do supabase-js', () =>
    jogo(fase1, {}, async (supabase) => {
      expect((await supabase.from('nao_existe').select()).error?.code).toBe('PGRST205')
      expect((await supabase.from('pedidos').select('nao_existe')).error?.code).toBe('42703')
      expect((await supabase.from('pedidos').select().eq('id', 'abc')).error?.code).toBe('22P02')
      // Só o schema public existe para a API, como no PostgREST.
      expect((await supabase.from('users').select()).error?.code).toBe('PGRST205')
      expect((await supabase.from('auth.users').select()).error?.code).toBe('JOGO_CHAMADA_INVALIDA')
      expect((await supabase.from('pedidos')).error?.message).toContain('Faltou dizer o que fazer')
      expect((await supabase.from('pedidos').select('id, cliente:user_id(email)')).error?.message).toContain('ainda não neste jogo')
    }))

  it('o que o jogo não tem avisa com clareza', () =>
    jogo(fase1, {}, async (supabase) => {
      const s = supabase as unknown as Record<string, any>
      expect(() => s.from('pedidos').select().range(0, 9)).toThrow('supabase.from().range() existe no supabase-js, mas ainda não neste jogo')
      expect(() => s.channel('x')).toThrow('supabase.channel() existe no supabase-js')
      expect(() => s.auth.signInWithOtp({})).toThrow('supabase.auth.signInWithOtp() existe no supabase-js')
      expect(() => s.from('pedidos').select('*', { count: 'exact' })).toThrow('ainda não neste jogo')
    }))
})

describe('rpc', () => {
  it('função de um valor devolve o valor; função de linhas devolve a lista, com RLS', () =>
    jogo(metadata, {}, async (supabase) => {
      expect(await supabase.rpc('total_de_pedidos')).toEqual({ data: 0, error: null })
      await supabase.auth.signInWithPassword(alice)
      expect(await supabase.rpc('total_de_pedidos')).toEqual({ data: 2, error: null })
      expect(ids(await supabase.rpc('pedidos_acima_de', { minimo: 10 }))).toEqual([2])
      expect((await supabase.rpc('nao_existe')).error?.code).toBe('42883')
      expect((await supabase.rpc('set_config', { setting_name: 'role', new_value: 'postgres', is_local: false })).error).not.toBeNull()
    }))
})

describe('reproduzir um ataque gravado', () => {
  it('diz se o ataque vence e não deixa nada no banco', async () => {
    const chamadas = await jogo(metadata, {}, async (supabase, partida) => {
      await supabase.auth.signInWithPassword(alice)
      await supabase.auth.updateUser({ data: { papel: 'gerente' } })
      await supabase.from('pedidos').insert({ id: 70, user_id: ALICE, itens: 'x', endereco: 'y', total: 1 })
      await supabase.from('pedidos').select()
      expect(partida.venceu).toBe(true)
      return partida.historico
    })

    const sessao = await abrirFase(base, metadata, { sessao: 'motor' })
    try {
      expect(await reproduzirAtaque(sessao, chamadas)).toBe(true)
      expect(await reproduzirAtaque(sessao, chamadas)).toBe(true)
      const meta = await sessao.db.query(`select raw_user_meta_data as m from auth.users where id = '${ALICE}'`)
      expect(meta.rows).toEqual([{ m: {} }])
      expect((await sessao.linhasAtuais()).pedidos).toHaveLength(4)
    } finally {
      await sessao.fechar()
    }
  })
})

describe('executarCodigo', () => {
  it('roda o texto digitado pelo jogador, com await e console', () =>
    jogo(fase1, {}, async (supabase, partida) => {
      const saida: unknown[][] = []
      const console = { log: (...a: unknown[]) => saida.push(a), info() {}, warn() {}, error() {} }
      await executarCodigo(
        `const { data, error } = await supabase.from('pedidos').select('id').eq('id', 7)
         console.log('achei', data.length, error)`,
        supabase,
        console,
      )
      expect(saida).toEqual([['achei', 1, null]])
      expect(partida.venceu).toBe(true)
    }))

  it('erro de sintaxe e erro em tempo de execução viram exceção', () =>
    jogo(fase1, {}, async (supabase) => {
      const console = { log() {}, info() {}, warn() {}, error() {} }
      await expect(executarCodigo('const x = ;', supabase, console)).rejects.toThrow(SyntaxError)
      await expect(executarCodigo(`await supabase.from('pedidos').select().range(0, 1)`, supabase, console)).rejects.toThrow('ainda não neste jogo')
    }))
})
