import { beforeAll, describe, expect, it } from 'vitest'
import { baseSql, fase } from '../fases/carregar.node'
import { abrirFase, criarBase, montarGrade, testarDefesa, type Chamada, type Fase, type Snapshot } from './index'

const fase1 = fase('01-rls-desligado')
const ALICE = 'a11ce000-0000-4000-8000-000000000001'
const BRUNO = 'b0b00000-0000-4000-8000-000000000002'
const ATAQUE: Chamada[] = [{ tipo: 'from', tabela: 'pedidos', operacao: 'select', colunas: '*', filtros: [] }]

let base: Snapshot
beforeAll(async () => {
  base = await criarBase(baseSql)
})

async function comSessao<T>(opcoes: Parameters<typeof abrirFase>[2], fn: (s: Awaited<ReturnType<typeof abrirFase>>) => Promise<T>, f: Fase = fase1) {
  const sessao = await abrirFase(base, f, opcoes)
  try {
    return await fn(sessao)
  } finally {
    await sessao.fechar()
  }
}

describe('executar', () => {
  it('roda com a identidade pedida e não deixa rastro na sessão', () =>
    comSessao({ sqlDoJogador: fase1.solucaoSql }, async (s) => {
      const r = await s.executar('alice', `select auth.uid() as uid, current_user as papel, auth.jwt() ->> 'email' as email`)
      expect(r.data).toEqual([{ uid: ALICE, papel: 'authenticated', email: 'alice@exemplo.com' }])
      const anon = await s.executar('anon', 'select auth.uid() as uid, current_user as papel')
      expect(anon.data).toEqual([{ uid: null, papel: 'anon' }])
      const depois = await s.db.query(`select current_user as papel, current_setting('request.jwt.claims', true) as claims`)
      expect(depois.rows).toEqual([{ papel: 'postgres', claims: '' }])
    }))

  it('devolve erro no formato { code, message } em vez de lançar', () =>
    comSessao({ sqlDoJogador: fase1.solucaoSql }, async (s) => {
      const r = await s.executar('alice', `insert into pedidos (id, user_id, itens, endereco, total) values (99, $1, 'x', 'x', 1)`, [BRUNO])
      expect(r.data).toBeNull()
      expect(r.error?.code).toBe('42501')
      const inexistente = await s.executar('alice', 'select * from nao_existe')
      expect(inexistente.error?.code).toBe('42P01')
      // A sessão continua utilizável depois do erro.
      expect((await s.executar('alice', 'select id from pedidos order by id')).data).toEqual([{ id: 1 }, { id: 2 }])
    }))

  it('com desfazer, a escrita não fica no banco', () =>
    comSessao({}, async (s) => {
      const r = await s.executar('anon', 'delete from pedidos', [], { desfazer: true })
      expect(r.afetadas).toBe(4)
      expect((await s.linhasAtuais()).pedidos).toHaveLength(4)
    }))
})

describe('sessão do jogador', () => {
  it('não é superusuário e não escapa do papel', () =>
    comSessao({ sessao: 'jogador', sqlDoJogador: fase1.solucaoSql }, async (s) => {
      const quem = await s.db.query(`select session_user as sessao, (select rolsuper from pg_roles where rolname = session_user) as super`)
      expect(quem.rows).toEqual([{ sessao: 'jogador', super: false }])
      for (const fuga of [
        'set role postgres',
        `select set_config('role', 'postgres', false)`,
        'alter table pedidos disable row level security',
        'select * from auth.users',
      ]) {
        const r = await s.executar('alice', fuga)
        expect(r.error?.code, fuga).toBe('42501')
      }
      // RESET ROLE é permitido, mas só volta para jogador, que não tem grant na tabela.
      await s.db.exec('reset role')
      const papel = await s.db.query('select current_user as papel')
      expect(papel.rows).toEqual([{ papel: 'jogador' }])
      await expect(s.db.query('select * from pedidos')).rejects.toMatchObject({ code: '42501' })
      expect((await s.executar('alice', 'select id from pedidos order by id')).data).toEqual([{ id: 1 }, { id: 2 }])
    }))
})

describe('grade de visibilidade', () => {
  const desenhar = (g: Awaited<ReturnType<typeof montarGrade>>[number]) =>
    g.usuarios.map((u) => `${u.nome}: ${u.celulas.map((c) => (c.ve ? (c.deveria ? '✓' : '!') : c.deveria ? '?' : '·')).join(' ')}`)

  it('furada: todo mundo vê tudo, e o que não devia fica marcado', () =>
    comSessao({}, async (s) => {
      const [g] = await montarGrade(s)
      expect(g!.chaves).toEqual(['1', '2', '5', '7'])
      expect(desenhar(g!)).toEqual(['alice: ✓ ✓ ! !', 'bruno: ! ! ✓ ✓', 'anon: ! ! ! !'])
      expect(g!.divergencias).toBe(8)
    }))

  it('consertada: bate com o gabarito', () =>
    comSessao({ sqlDoJogador: fase1.solucaoSql }, async (s) => {
      const [g] = await montarGrade(s)
      expect(desenhar(g!)).toEqual(['alice: ✓ ✓ · ·', 'bruno: · · ✓ ✓', 'anon: · · · ·'])
      expect(g!.divergencias).toBe(0)
    }))
})

describe('bateria: consertos que não valem', () => {
  const reprovados = async (sql: string) => {
    const r = await testarDefesa(base, fase1, sql, [{ nome: 'referência', chamadas: ATAQUE }])
    expect(r.passou).toBe(false)
    return r.testes.filter((t) => !t.ok)
  }

  it('ligar o RLS sem política quebra o uso legítimo', async () => {
    const r = await reprovados('alter table pedidos enable row level security;')
    expect(r.every((t) => t.tipo === 'uso')).toBe(true)
    expect(r.map((t) => t.nome)).toContain('alice continua lendo o que é dele em pedidos')
  })

  it('apagar os dados para "passar" é reprovado', async () => {
    const r = await reprovados('delete from pedidos;')
    expect(r.map((t) => t.nome)).toContain('os dados do app continuam intactos')
  })

  it('apagar a tabela é reprovado', async () => {
    const r = await reprovados('drop table pedidos;')
    expect(r.map((t) => t.nome)).toContain('os dados do app continuam intactos')
  })

  it('tirar o grant resolve o vazamento, mas quebra o app', async () => {
    const r = await reprovados('revoke all on pedidos from anon, authenticated;')
    expect(r.every((t) => t.tipo === 'uso')).toBe(true)
  })

  it('política só de leitura deixa o uso de escrita quebrado', async () => {
    const r = await reprovados(`
      alter table pedidos enable row level security;
      create policy leitura on pedidos for select to authenticated using (user_id = auth.uid());`)
    expect(r.map((t) => t.nome)).toContain('alice continua podendo: altera o que é dele em pedidos')
  })

  it('USING (true) continua vazando', async () => {
    const r = await reprovados(`
      alter table pedidos enable row level security;
      create policy provisoria on pedidos for all using (true);`)
    expect(r.some((t) => t.tipo === 'ataque')).toBe(true)
    expect(r.map((t) => t.nome)).toContain('ataque barrado: referência')
  })

  it('SQL inválido volta como erro, sem rodar a bateria', async () => {
    const r = await testarDefesa(base, fase1, 'alter tabel pedidos enable row level security;')
    expect(r.passou).toBe(false)
    expect(r.testes).toEqual([])
    expect(r.erroSql?.code).toBe('42601')
  })
})
