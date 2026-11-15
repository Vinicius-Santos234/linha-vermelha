// Prova de fogo do PGlite (passo 1 dos Próximos Passos).
// Módulo sem dependência de ambiente: roda igual em Node e num Web Worker.
// Recebe a classe PGlite e os três SQLs, devolve a lista de checagens.
//
// Resultado em 14/11/2026 (Node 24 e Edge 157, Windows 11):
// - 0.2.17 passa em tudo, inclusive a sessão não-superusuário (etapa 7).
// - 0.5.16 passa nas etapas 1 a 6, mas falha na 7: a opção `username` virou um
//   `SET ROLE` depois de abrir como postgres, então `RESET ROLE` devolve o superusuário.
// Por isso o projeto fixa a 0.2.17. Antes de subir de versão, rodar esta prova.

const ALICE = 'a11ce000-0000-4000-8000-000000000001'
const BRUNO = 'b0b00000-0000-4000-8000-000000000002'

const anon = { role: 'anon', claims: { role: 'anon' } }
const logado = (sub) => ({ role: 'authenticated', claims: { sub, role: 'authenticated' } })

// Esboço do executar() do motor: transação, SET LOCAL ROLE, claims locais.
async function executar(db, identidade, sql, params = []) {
  try {
    const res = await db.transaction(async (tx) => {
      await tx.query(`set local role ${identidade.role}`)
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify(identidade.claims),
      ])
      return tx.query(sql, params)
    })
    return { data: res.rows, afetadas: res.affectedRows, error: null }
  } catch (e) {
    return { data: null, error: { code: e.code, message: e.message } }
  }
}

const ids = (r) => (r.data ?? []).map((l) => l.id).sort((a, b) => a - b).join(',')

export async function rodarProva(PGlite, { base, setup, solucao }) {
  const checagens = []
  const checar = (nome, ok, detalhe = '') => checagens.push({ nome, ok: !!ok, detalhe: String(detalhe) })
  const etapa = async (nome, fn) => {
    try {
      await fn()
    } catch (e) {
      checar(nome, false, `EXCEÇÃO: ${e.message}`)
    }
  }

  let db
  let snapshot

  await etapa('1. abrir o banco e rodar base.sql', async () => {
    db = new PGlite()
    const v = await db.query('select version()')
    await db.exec(base)
    checar('1. abrir o banco e rodar base.sql', true, v.rows[0].version.slice(0, 40))
  })
  if (!db) return checagens

  await etapa('2. snapshot depois do base.sql (dumpDataDir)', async () => {
    snapshot = await db.dumpDataDir()
    checar('2. snapshot depois do base.sql (dumpDataDir)', snapshot.size > 0, `${(snapshot.size / 1e6).toFixed(1)} MB`)
  })

  await etapa('3. fase 1 furada', async () => {
    await db.exec(setup)
    const r = await executar(db, anon, 'select id from pedidos')
    checar('3a. furada: anon lê todos os pedidos', ids(r) === '1,2,5,7', ids(r) || r.error?.message)
    const alvo = await executar(db, anon, 'select id, itens from pedidos where id = 7')
    checar('3b. furada: a linha-alvo (#7 do Bruno) chega ao anon', alvo.data?.length === 1, alvo.data?.[0]?.itens)
    const escrita = await executar(db, anon, `update pedidos set status = 'cancelado' where id = 7`)
    checar('3c. furada: anon altera o pedido do Bruno', escrita.afetadas === 1, escrita.error?.message ?? `${escrita.afetadas} linha`)
  })

  await etapa('4. fase 1 consertada', async () => {
    await db.exec(solucao)
    const a = await executar(db, anon, 'select id from pedidos')
    checar('4a. consertada: anon não vê nada', ids(a) === '', ids(a) || 'vazio')
    const al = await executar(db, logado(ALICE), 'select id from pedidos')
    checar('4b. consertada: Alice vê só os dela', ids(al) === '1,2', ids(al))
    const br = await executar(db, logado(BRUNO), 'select id from pedidos')
    checar('4c. consertada: Bruno vê só os dele', ids(br) === '5,7', ids(br))
    const up = await executar(db, logado(ALICE), `update pedidos set status = 'x' where id = 7`)
    checar('4d. consertada: Alice não altera o #7', up.afetadas === 0, up.error?.message ?? `${up.afetadas} linhas`)
    const ins = await executar(
      db,
      logado(ALICE),
      `insert into pedidos (id, user_id, itens, endereco, total) values (99, $1, 'x', 'x', 1)`,
      [BRUNO],
    )
    checar('4e. consertada: Alice não insere em nome do Bruno (WITH CHECK)', ins.error?.code === '42501', ins.error?.message)
    const uid = await executar(db, logado(ALICE), 'select auth.uid() as uid, current_user as papel')
    checar('4f. auth.uid() lê o sub dos claims', uid.data?.[0]?.uid === ALICE && uid.data?.[0]?.papel === 'authenticated', JSON.stringify(uid.data?.[0]))
  })

  await etapa('5. SET LOCAL não vaza da transação', async () => {
    const r = await db.query(`select current_user as papel, current_setting('request.jwt.claims', true) as claims`)
    const { papel, claims } = r.rows[0]
    checar('5. SET LOCAL não vaza da transação', papel === 'postgres' && !claims, `papel=${papel} claims=${claims || 'vazio'}`)
  })

  await etapa('6. recomeçar a partir do snapshot (loadDataDir)', async () => {
    const novo = new PGlite({ loadDataDir: snapshot })
    const t = await novo.query(`select to_regclass('public.pedidos') as tabela, to_regproc('auth.uid') as funcao`)
    checar('6a. snapshot: base presente, fase ausente', t.rows[0].tabela === null && t.rows[0].funcao !== null, JSON.stringify(t.rows[0]))
    await novo.exec(setup)
    const r = await executar(novo, anon, 'select id from pedidos')
    checar('6b. snapshot: a fase furada volta a vazar', ids(r) === '1,2,5,7', ids(r) || r.error?.message)
    await novo.close()
  })

  // Risco 2: sessão do jogador como não-superusuário.
  await etapa('7. sessão não-superusuário', async () => {
    await db.exec(`
      create function public.segredo() returns text language sql security definer as $$ select 'so o dono ve' $$;
      revoke all on function public.segredo() from public;
      -- O cenário da fase 13: o jogador pode criar função em public.
      grant create on schema public to jogador;
    `)
    const comFase = await db.dumpDataDir()
    const j = new PGlite({ loadDataDir: comFase, username: 'jogador' })
    const quem = await j.query(`select session_user as sessao, current_user as papel,
      (select rolsuper from pg_roles where rolname = session_user) as super`)
    const { sessao, papel, super: ehSuper } = quem.rows[0]
    checar('7a. sessão abre como jogador, sem superusuário', sessao === 'jogador' && ehSuper === false, `sessao=${sessao} papel=${papel} super=${ehSuper}`)

    const tenta = async (sql) => {
      try {
        const r = await j.query(sql)
        return { ok: true, rows: r.rows }
      } catch (e) {
        return { ok: false, code: e.code, message: e.message }
      }
    }
    const f1 = await tenta('set role postgres')
    checar('7b. SET ROLE postgres é negado', !f1.ok, f1.message ?? 'PASSOU (fuga!)')
    const f2 = await tenta(`select set_config('role', 'postgres', false)`)
    checar('7c. set_config(role, postgres) é negado', !f2.ok, f2.message ?? 'PASSOU (fuga!)')
    const f3 = await tenta('alter table pedidos disable row level security')
    checar('7d. desligar o RLS é negado (não é dono)', !f3.ok, f3.message ?? 'PASSOU (fuga!)')
    const f4 = await tenta('select * from auth.users')
    checar('7e. ler auth.users é negado', !f4.ok, f4.message ?? 'PASSOU (fuga!)')
    const f5 = await tenta('select public.segredo()')
    checar('7f. função sem grant é negada', !f5.ok, f5.message ?? 'PASSOU (fuga!)')
    const f6 = await tenta(`
      create function public.fuga() returns text language plpgsql as $$
      begin perform set_config('role', 'postgres', false); return current_user; end $$`)
    const f6b = f6.ok ? await tenta('select public.fuga()') : f6
    checar('7g. fuga por corpo de função é negada', !f6b.ok, f6b.message ?? 'PASSOU (fuga!)')

    await tenta('reset role')
    const al = await executar(j, logado(ALICE), 'select id from pedidos')
    checar('7h. o motor ainda vira authenticated e o RLS filtra', ids(al) === '1,2', ids(al) || al.error?.message)
    const an = await executar(j, anon, 'select id from pedidos')
    checar('7i. como anon, nada', ids(an) === '' && !an.error, ids(an) || an.error?.message || 'vazio')
    const rr = await executar(j, logado(ALICE), 'reset role; ')
    const depois = await tenta('select current_user as papel')
    checar('7j. RESET ROLE só volta para jogador', depois.rows?.[0]?.papel === 'jogador', `papel=${depois.rows?.[0]?.papel} ${rr.error?.message ?? ''}`)
    await j.close()
  })

  await db.close()
  return checagens
}

export function imprimir(titulo, checagens, log = console.log) {
  log(`\n=== ${titulo} ===`)
  for (const c of checagens) log(`${c.ok ? ' ok ' : 'FALHA'}  ${c.nome}${c.detalhe ? `  → ${c.detalhe}` : ''}`)
  const falhas = checagens.filter((c) => !c.ok).length
  log(falhas ? `>>> ${falhas} falha(s) de ${checagens.length}` : `>>> ${checagens.length} de ${checagens.length} passaram`)
  return falhas
}
