// O modo livre: roda o SQL que o jogador escrever (tabelas, dados e políticas) num banco
// novo e mostra, para cada usuário, quais linhas de cada tabela ele enxerga. Sem gabarito.
import { ANON, executarEm, novoBanco, usuarioDe, type Snapshot, type UsuarioDoBanco } from './sessao'
import { ident, paraErroSql } from './sql'
import type { ErroSql, Linha, Usuario } from './tipos'

export interface TabelaExplorada {
  nome: string
  colunas: string[]
  rlsLigado: boolean
  /** Todas as linhas, vistas sem RLS (até o limite). */
  linhas: Linha[]
  /** Para cada usuário, os índices das linhas que ele enxerga. */
  visiveis: Record<string, number[]>
}

export interface Exploracao {
  erroSql: ErroSql | null
  usuarios: string[]
  tabelas: TabelaExplorada[]
}

const LIMITE = 200

export async function explorar(base: Snapshot, sql: string): Promise<Exploracao> {
  const db = novoBanco({ loadDataDir: base })
  try {
    try {
      await db.exec(sql)
    } catch (e) {
      return { erroSql: paraErroSql(e), usuarios: [], tabelas: [] }
    }
    const cadastrados = await db.query<UsuarioDoBanco>('select id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data from auth.users order by email')
    const usuarios: Usuario[] = [...cadastrados.rows.map((u) => usuarioDe(u)), ANON]
    const catalogo = await db.query<{ nome: string; rls: boolean }>(`
      select relname as nome, relrowsecurity as rls from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`)

    const tabelas: TabelaExplorada[] = []
    for (const { nome, rls } of catalogo.rows) {
      const tabela = `public.${ident(nome)}`
      // O ctid identifica a linha mesmo em tabela sem chave primária.
      const todas = await db.query<Linha>(`select ctid::text as "__linha", * from ${tabela} order by ctid limit ${LIMITE}`)
      const posicao = new Map(todas.rows.map((l, i) => [l.__linha as string, i]))
      const visiveis: Record<string, number[]> = {}
      for (const usuario of usuarios) {
        const r = await db.transaction((tx) => executarEm(tx, usuario, `select ctid::text as linha from ${tabela}`, []))
        visiveis[usuario.nome] = ((r as Awaited<ReturnType<typeof executarEm>>).data ?? [])
          .map((l) => posicao.get(l.linha as string))
          .filter((i): i is number => i !== undefined)
      }
      tabelas.push({
        nome,
        rlsLigado: rls,
        colunas: todas.fields.map((f) => f.name).filter((c) => c !== '__linha'),
        linhas: todas.rows.map(({ __linha: _, ...resto }) => resto),
        visiveis,
      })
    }
    return { erroSql: null, usuarios: usuarios.map((u) => u.nome), tabelas }
  } finally {
    await db.close()
  }
}
