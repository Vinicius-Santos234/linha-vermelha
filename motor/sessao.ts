import type { PGlite, Transaction } from '@electric-sql/pglite'
import { ident, literal, paraErroSql, tabelaPublica } from './sql'
import { regraDe, type ErroSql, type Fase, type Linha, type Objetivo, type Resposta, type Usuario } from './tipos'

export type Snapshot = Blob | File

// O motor não importa o PGlite: quem o usa entrega a classe. No site ela vem de um
// arquivo estático carregado dentro do Worker do banco; nos testes, do pacote npm.
let Banco: typeof PGlite | null = null

export function usarPGlite(classe: typeof PGlite): void {
  Banco = classe
}

export function novoBanco(opcoes: { loadDataDir?: Snapshot; username?: string } = {}): PGlite {
  if (!Banco) throw new Error('Chame usarPGlite() antes de abrir um banco.')
  return new Banco(opcoes)
}

/**
 * 'motor': sessão superusuário. Serve para a bateria e a grade, onde só roda SQL do motor.
 * 'jogador': sessão sem superusuário e sem posse de nada. É a única em que roda código
 * escrito pelo jogador no Ataque (risco 2 do projeto).
 */
export type TipoDeSessao = 'motor' | 'jogador'

export const ANON: Usuario = {
  nome: 'anon',
  id: null,
  email: null,
  user_metadata: {},
  app_metadata: {},
  anonimo: true,
}

/** O SQL que o jogador escreveu na Defesa não rodou. */
export class ErroNoSqlDoJogador extends Error {
  constructor(readonly erro: ErroSql) {
    super(erro.message)
    this.name = 'ErroNoSqlDoJogador'
  }
}

/** Roda o base.sql uma vez e devolve o snapshot de onde toda fase parte. */
export async function criarBase(baseSql: string): Promise<Snapshot> {
  const db = novoBanco()
  try {
    await db.exec(baseSql)
    return await db.dumpDataDir()
  } finally {
    await db.close()
  }
}

export interface OpcoesDeFase {
  sessao?: TipoDeSessao
  /** Defesa: o SQL do jogador, aplicado por cima das tabelas e dados da fase, no lugar das políticas furadas. */
  sqlDoJogador?: string
}

export async function abrirFase(base: Snapshot, fase: Fase, opcoes: OpcoesDeFase = {}): Promise<Sessao> {
  const tipo = opcoes.sessao ?? 'motor'
  let db = novoBanco({ loadDataDir: base })
  try {
    await db.exec(fase.setupSql)
    // A verdade é lida antes do SQL do jogador: apagar dados não muda o que o gabarito espera.
    const verdade = await lerTabelas(db, fase)
    if (opcoes.sqlDoJogador === undefined) {
      await db.exec(fase.politicasSql)
    } else {
      try {
        await db.exec(opcoes.sqlDoJogador)
      } catch (e) {
        throw new ErroNoSqlDoJogador(paraErroSql(e))
      }
    }
    // Os usuários são lidos depois: um conserto pode mexer no app_metadata de alguém.
    const usuarios = await lerUsuarios(db, fase)
    await db.exec(sqlDoObjetivo(fase.def.objetivo, regraDe(fase.def, fase.def.objetivo.tabela).chave))
    if (tipo === 'jogador') {
      const comFase = await db.dumpDataDir()
      await db.close()
      db = novoBanco({ loadDataDir: comFase, username: 'jogador' })
    }
    return new Sessao(db, fase, tipo, usuarios, verdade)
  } catch (e) {
    await db.close().catch(() => {})
    throw e
  }
}

export class Sessao {
  constructor(
    readonly db: PGlite,
    readonly fase: Fase,
    readonly tipo: TipoDeSessao,
    /** Os usuários da fase, com o visitante sem login por último. */
    readonly usuarios: Usuario[],
    /** As linhas de cada tabela do gabarito como a fase as criou. */
    readonly verdade: Record<string, Linha[]>,
  ) {}

  usuario(nome: string): Usuario {
    const u = this.usuarios.find((x) => x.nome === nome)
    if (!u) throw new Error(`A fase ${this.fase.def.id} não tem o usuário "${nome}".`)
    return u
  }

  /** Executa um SQL como um usuário: SET LOCAL ROLE + claims, numa transação só dele. */
  async executar(como: string | Usuario, sql: string, params: unknown[] = [], opcoes: { desfazer?: boolean } = {}): Promise<Resposta> {
    const usuario = typeof como === 'string' ? this.usuario(como) : como
    return (await this.db.transaction(async (tx) => {
      const resposta = await executarEm(tx, usuario, sql, params)
      if (opcoes.desfazer) await tx.rollback()
      return resposta
    })) as Resposta
  }

  /** As linhas atuais das tabelas do gabarito, vistas sem RLS. Só na sessão 'motor'. */
  async linhasAtuais(): Promise<Record<string, Linha[]>> {
    if (this.tipo !== 'motor') throw new Error('linhasAtuais() só existe na sessão do motor.')
    return lerTabelas(this.db, this.fase)
  }

  async fechar(): Promise<void> {
    await this.db.close()
  }
}

export interface OpcoesDeExecucao {
  /** O papel do Postgres. Padrão: anon ou authenticated, conforme o usuário. */
  papel?: string
  /** O search_path só desta chamada. */
  caminho?: string
  /** Recusa qualquer escrita. */
  somenteLeitura?: boolean
}

/** O coração: uma chamada com a identidade de alguém, isolada num savepoint. */
export async function executarEm(tx: Transaction, usuario: Usuario, sql: string, params: unknown[], opcoes: OpcoesDeExecucao = {}): Promise<Resposta> {
  const papel = opcoes.papel ?? (usuario.anonimo ? 'anon' : 'authenticated')
  await tx.query('savepoint chamada')
  try {
    // Os claims e o search_path são postos antes de trocar de papel: só o motor pode.
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claimsDe(usuario))])
    let caminhoAnterior: string | null = null
    if (opcoes.caminho) {
      caminhoAnterior = (await tx.query<{ c: string }>(`select current_setting('search_path') as c`)).rows[0]!.c
      await tx.query(`select set_config('search_path', $1, true)`, [opcoes.caminho])
    }
    await tx.query(`set local role ${ident(papel)}`)
    if (opcoes.somenteLeitura) await tx.query('set local transaction_read_only = on')
    const r = await tx.query<Linha>(sql, params)
    await tx.query('set local role none')
    if (caminhoAnterior !== null) await tx.query(`select set_config('search_path', $1, true)`, [caminhoAnterior])
    await tx.query('release savepoint chamada')
    return { data: r.rows, afetadas: r.affectedRows ?? 0, error: null }
  } catch (e) {
    await tx.query('rollback to savepoint chamada')
    await tx.query('release savepoint chamada')
    return { data: null, afetadas: 0, error: paraErroSql(e) }
  }
}

/** Os claims no formato do JWT do Supabase. */
export function claimsDe(usuario: Usuario): Record<string, unknown> {
  if (usuario.anonimo) return { role: 'anon' }
  return {
    sub: usuario.id,
    role: 'authenticated',
    aud: 'authenticated',
    email: usuario.email,
    user_metadata: usuario.user_metadata,
    app_metadata: usuario.app_metadata,
  }
}

/** O formato devolvido pelas funções motor.entrar, motor.usuario etc. */
export interface UsuarioDoBanco {
  id: string
  email: string
  email_confirmed_at: string | null
  raw_user_meta_data: Record<string, unknown> | null
  raw_app_meta_data: Record<string, unknown> | null
}

export function usuarioDe(linha: UsuarioDoBanco, nome = linha.email.split('@')[0] ?? linha.email): Usuario {
  return {
    nome,
    id: linha.id,
    email: linha.email,
    user_metadata: linha.raw_user_meta_data ?? {},
    app_metadata: linha.raw_app_meta_data ?? {},
    anonimo: false,
  }
}

async function lerUsuarios(db: PGlite, fase: Fase): Promise<Usuario[]> {
  const r = await db.query<{ id: string; email: string; raw_user_meta_data: Record<string, unknown>; raw_app_meta_data: Record<string, unknown> }>(
    'select id, email, raw_user_meta_data, raw_app_meta_data from auth.users',
  )
  const usuarios = Object.keys(fase.def.usuarios).map((nome): Usuario => {
    const linha = r.rows.find((u) => u.email?.startsWith(`${nome}@`))
    if (!linha) throw new Error(`Fase ${fase.def.id}: o setup.sql não criou "${nome}@..." em auth.users.`)
    return {
      nome,
      id: linha.id,
      email: linha.email,
      user_metadata: linha.raw_user_meta_data ?? {},
      app_metadata: linha.raw_app_meta_data ?? {},
      anonimo: false,
    }
  })
  return [...usuarios, ANON]
}

async function lerTabelas(db: PGlite, fase: Fase): Promise<Record<string, Linha[]>> {
  const tabelas: Record<string, Linha[]> = {}
  for (const tabela of Object.keys(fase.def.gabarito)) {
    const chave = regraDe(fase.def, tabela).chave
    const r = await db.query<Linha>(`select * from ${tabelaPublica(tabela)} order by ${ident(chave)}`)
    tabelas[tabela] = r.rows
  }
  return tabelas
}

/**
 * Para o objetivo de alterar, o motor precisa olhar o banco sem RLS mesmo na sessão do
 * jogador. Esta função SECURITY DEFINER devolve só sim ou não, então chamá-la não vaza nada.
 */
function sqlDoObjetivo(objetivo: Objetivo, chave: string): string {
  const condicao =
    objetivo.tipo === 'alterar'
      ? `exists (select 1 from ${tabelaPublica(objetivo.tabela)}
           where ${ident(chave)}::text = ${literal(String(objetivo.id))}
             and ${ident(objetivo.campo)}::text is not distinct from ${literal(objetivo.valor === null ? null : String(objetivo.valor))})`
      : 'false'
  return `
    create or replace function motor.objetivo_atingido() returns boolean
      language sql stable security definer set search_path = ''
      as $motor$ select ${condicao} $motor$;
    revoke all on function motor.objetivo_atingido() from public;
    grant execute on function motor.objetivo_atingido() to jogador;
  `
}
