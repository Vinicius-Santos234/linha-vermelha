// A partida: o lado do servidor de uma sessão de jogo. Recebe as chamadas do cliente
// supabase-js falso, sabe quem está logado, traduz, executa e detecta o objetivo.
import type { Transaction } from '@electric-sql/pglite'
import { t } from '../mensagens/t'
import { aindaNao, ErroDeChamada, type Chamada, type ChamadaAuth, type ChamadaFrom, type ChamadaRpc, type ErroCliente, type RespostaCliente } from './chamada'
import { ANON, executarEm, usuarioDe, type Sessao, type UsuarioDoBanco } from './sessao'
import { paraErroSql } from './sql'
import { traduzirFrom, traduzirRpc, traduzirSombra } from './tradutor'
import { regraDe, type ErroSql, type Linha, type Usuario } from './tipos'

const SEM_SESSAO: ErroCliente = { message: 'Auth session missing!', code: 'session_not_found', status: 400 }

export class Partida {
  /** Quem está logado agora. Começa como visitante, igual a um app aberto pela primeira vez. */
  usuario: Usuario = ANON
  venceu = false
  /** Tudo o que o jogador chamou, na ordem. No Ciclo completo, vira teste da Defesa. */
  readonly historico: Chamada[] = []

  /**
   * Com `tx`, a partida inteira acontece dentro dessa transação (é como a bateria
   * reproduz um ataque e desfaz tudo). Sem ela, cada chamada é uma transação própria.
   */
  constructor(
    private readonly sessao: Sessao,
    private readonly tx?: Transaction,
  ) {}

  async chamar(chamada: Chamada): Promise<RespostaCliente> {
    this.historico.push(chamada)
    try {
      const rodar = (tx: Transaction) => this.despachar(tx, chamada)
      return this.tx ? await rodar(this.tx) : ((await this.sessao.db.transaction(rodar)) as RespostaCliente)
    } catch (e) {
      if (e instanceof ErroDeChamada) return { data: null, error: { message: e.message, code: e.code, details: null, hint: null } }
      return { data: null, error: paraErroCliente(paraErroSql(e)) }
    }
  }

  private despachar(tx: Transaction, chamada: Chamada): Promise<RespostaCliente> {
    switch (chamada?.tipo) {
      case 'from':
        return this.from(tx, chamada)
      case 'rpc':
        return this.rpc(tx, chamada)
      case 'auth':
        return this.auth(tx, chamada)
      default:
        throw new ErroDeChamada(t('partida.chamadaDesconhecida'), 'JOGO_CHAMADA_INVALIDA')
    }
  }

  private async from(tx: Transaction, c: ChamadaFrom): Promise<RespostaCliente> {
    const { sql, params } = traduzirFrom(c)
    const r = await executarEm(tx, this.usuario, sql, params)
    if (r.error) return { data: null, error: paraErroCliente(r.error) }

    const devolveLinhas = c.operacao === 'select' || c.retornar !== undefined
    let resposta: RespostaCliente = { data: devolveLinhas ? r.data : null, error: null }
    if (devolveLinhas && c.unica) resposta = umaSo(r.data ?? [], c.unica)

    if (resposta.error === null && resposta.data !== null) await this.conferirLeitura(tx, c, r.data ?? [])
    await this.conferirEstado(tx)
    return resposta
  }

  private async rpc(tx: Transaction, c: ChamadaRpc): Promise<RespostaCliente> {
    const { sql, params } = traduzirRpc(c)
    const r = await executarEm(tx, this.usuario, sql, params)
    if (r.error) return { data: null, error: paraErroCliente(r.error) }
    await this.conferirEstado(tx)
    // Função que devolve um valor só aparece como uma linha com uma coluna de mesmo nome.
    const linhas = r.data ?? []
    const escalar = linhas.length === 1 && Object.keys(linhas[0]!).length === 1 && c.nome in linhas[0]!
    return { data: escalar ? linhas[0]![c.nome] : linhas, error: null }
  }

  /** Objetivo de ler: a linha-alvo veio nesta resposta? */
  private async conferirLeitura(tx: Transaction, c: ChamadaFrom, linhas: Linha[]): Promise<void> {
    const objetivo = this.sessao.fase.def.objetivo
    if (this.venceu || objetivo.tipo !== 'ler' || c.tabela !== objetivo.tabela) return
    const chave = regraDe(this.sessao.fase.def, objetivo.tabela).chave
    let chaves: unknown[]
    if (c.operacao === 'select') {
      // A resposta pode não trazer a coluna da chave: a sombra repete o filtro pedindo só ela.
      const sombra = traduzirSombra(c, chave)
      const r = await executarEm(tx, this.usuario, sombra.sql, sombra.params)
      chaves = (r.data ?? []).map((l) => l.chave)
    } else {
      chaves = linhas.map((l) => l[chave])
    }
    if (chaves.some((k) => String(k) === String(objetivo.id))) this.venceu = true
  }

  /** Objetivo de alterar: o banco ficou no estado pedido? */
  private async conferirEstado(tx: Transaction): Promise<void> {
    if (this.venceu || this.sessao.fase.def.objetivo.tipo !== 'alterar') return
    const r = await tx.query<{ ok: boolean }>('select motor.objetivo_atingido() as ok')
    if (r.rows[0]?.ok === true) this.venceu = true
  }

  private async auth(tx: Transaction, c: ChamadaAuth): Promise<RespostaCliente> {
    switch (c.metodo) {
      case 'signInWithPassword': {
        const u = await this.motor(tx, 'select motor.entrar($1, $2) as u', [texto(c.email, 'email'), texto(c.senha, 'password')])
        if (!u) {
          return { data: { user: null, session: null }, error: { message: 'Invalid login credentials', code: 'invalid_credentials', status: 400 } }
        }
        return this.entrou(u)
      }
      case 'signUp': {
        const email = texto(c.email, 'email')
        const senha = texto(c.senha, 'password')
        if (senha.length < 6) {
          return { data: { user: null, session: null }, error: { message: 'Password should be at least 6 characters.', code: 'weak_password', status: 422 } }
        }
        try {
          return this.entrou((await this.motor(tx, 'select motor.cadastrar($1, $2, $3::jsonb) as u', [email, senha, JSON.stringify(dados(c.dados))]))!)
        } catch (e) {
          if (paraErroSql(e).code !== '23505') throw e
          return { data: { user: null, session: null }, error: { message: 'User already registered', code: 'user_already_exists', status: 422 } }
        }
      }
      case 'updateUser': {
        if (this.usuario.anonimo) return { data: { user: null }, error: SEM_SESSAO }
        const u = await this.motor(tx, 'select motor.atualizar_usuario($1, $2::jsonb) as u', [this.usuario.id, JSON.stringify(dados(c.dados))])
        // No Supabase de verdade o metadata novo entra no JWT na renovação do token.
        // Aqui a renovação é imediata: a próxima chamada já vai com os claims novos.
        this.usuario = usuarioDe(u!)
        return { data: { user: paraUser(u!) }, error: null }
      }
      case 'getUser': {
        if (this.usuario.anonimo) return { data: { user: null }, error: SEM_SESSAO }
        const u = await this.motor(tx, 'select motor.usuario($1) as u', [this.usuario.id])
        return u ? { data: { user: paraUser(u) }, error: null } : { data: { user: null }, error: SEM_SESSAO }
      }
      case 'signOut':
        this.usuario = ANON
        return { data: null, error: null }
      default:
        throw aindaNao(`auth.${String((c as { metodo?: unknown }).metodo)}()`)
    }
  }

  private entrou(u: UsuarioDoBanco): RespostaCliente {
    this.usuario = usuarioDe(u)
    const user = paraUser(u)
    return { data: { user, session: { user, access_token: 'jwt-de-mentira', token_type: 'bearer' } }, error: null }
  }

  /** Chama uma função do schema motor num savepoint, para um erro não derrubar a transação. */
  private async motor(tx: Transaction, sql: string, params: unknown[]): Promise<UsuarioDoBanco | null> {
    await tx.query('savepoint motor_auth')
    try {
      const r = await tx.query<{ u: UsuarioDoBanco | null }>(sql, params)
      await tx.query('release savepoint motor_auth')
      return r.rows[0]?.u ?? null
    } catch (e) {
      await tx.query('rollback to savepoint motor_auth')
      await tx.query('release savepoint motor_auth')
      throw e
    }
  }
}

/** Reproduz um ataque gravado numa transação que é desfeita. Diz se ele atinge o objetivo. */
export async function reproduzirAtaque(sessao: Sessao, chamadas: Chamada[]): Promise<boolean> {
  return (await sessao.db.transaction(async (tx) => {
    const partida = new Partida(sessao, tx)
    for (const chamada of chamadas) await partida.chamar(chamada)
    await tx.rollback()
    return partida.venceu
  })) as boolean
}

function umaSo(linhas: Linha[], modo: 'single' | 'maybeSingle'): RespostaCliente {
  if (linhas.length === 1) return { data: linhas[0], error: null }
  if (linhas.length === 0 && modo === 'maybeSingle') return { data: null, error: null }
  return {
    data: null,
    error: {
      code: 'PGRST116',
      message: 'Cannot coerce the result to a single JSON object',
      details: `The result contains ${linhas.length} rows`,
      hint: null,
    },
  }
}

function paraErroCliente(e: ErroSql): ErroCliente {
  // O PostgREST responde assim quando a tabela não existe na API.
  if (e.code === '42P01') return { code: 'PGRST205', message: e.message.replace(/^relation "(.+)" does not exist$/, "Could not find the table '$1' in the schema cache"), details: null, hint: null }
  return { code: e.code, message: e.message, details: e.details, hint: e.hint }
}

function texto(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !valor) throw new ErroDeChamada(t('partida.faltouCampo', { campo }), 'JOGO_CHAMADA_INVALIDA')
  return valor
}

function dados(valor: unknown): Record<string, unknown> {
  if (valor === undefined || valor === null) return {}
  if (typeof valor !== 'object' || Array.isArray(valor)) throw new ErroDeChamada(t('partida.dataObjeto'), 'JOGO_CHAMADA_INVALIDA')
  return valor as Record<string, unknown>
}

/** O objeto `user` como o supabase-js devolve. */
function paraUser(u: UsuarioDoBanco) {
  return {
    id: u.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: u.email,
    email_confirmed_at: u.email_confirmed_at,
    user_metadata: u.raw_user_meta_data ?? {},
    app_metadata: u.raw_app_meta_data ?? {},
  }
}
