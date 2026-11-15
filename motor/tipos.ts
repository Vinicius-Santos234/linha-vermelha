export type Linha = Record<string, unknown>

/** Quem faz a chamada, do ponto de vista da regra de negócio. */
export interface Usuario {
  /** Nome curto usado no jogo: 'alice', 'bruno', 'anon'. */
  nome: string
  /** `null` para o visitante sem login. */
  id: string | null
  email: string | null
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
  anonimo: boolean
}

/** Papel do usuário na história da fase. */
export type PapelNaFase = 'voce' | 'vitima' | (string & {})

/** Regra de negócio: este usuário pode fazer isto com esta linha? */
export type Regra = (linha: Linha, usuario: Usuario) => boolean

export interface RegraTabela {
  ler: Regra
  /** Se ausente, a bateria não testa UPDATE nesta tabela. */
  alterar?: Regra
  /** Se ausente, a bateria não testa DELETE nesta tabela. */
  apagar?: Regra
  /** Coluna que identifica a linha. Padrão: 'id'. */
  chave?: string
  /** Coluna que o teste de UPDATE toca (ela = ela). Padrão: a chave. Use quando nem toda coluna é editável. */
  alterarColuna?: string
}

export type Objetivo =
  /** Vence quando a linha-alvo aparece numa resposta devolvida ao jogador. */
  | { tipo: 'ler'; tabela: string; id: string | number }
  /** Vence quando a linha-alvo fica com `campo = valor` no banco. */
  | { tipo: 'alterar'; tabela: string; id: string | number; campo: string; valor: string | number | boolean | null }

export interface DefinicaoFase {
  id: string
  nivel: 1 | 2 | 3 | 4
  console: 'supabase-js' | 'sql'
  /** nome → papel na história. O nome é o começo do e-mail em auth.users (alice → alice@...). */
  usuarios: Record<string, PapelNaFase>
  /** O login que o briefing entrega ao jogador (o usuário 'voce'). */
  acesso: { email: string; senha: string }
  objetivo: Objetivo
  /** O gabarito: regra de negócio por tabela, independente das políticas (D10). */
  gabarito: Record<string, Regra | RegraTabela>
}

/** A definição mais o SQL que monta a fase. O motor não lê arquivo: quem chama entrega o texto. */
export interface Fase {
  def: DefinicaoFase
  /** Tabelas e dados. */
  setupSql: string
  /** As políticas furadas. No Ataque rodam depois do setup; na Defesa, são o que o jogador recebe para consertar. */
  politicasSql: string
}

export interface ErroSql {
  /** SQLSTATE do Postgres, o mesmo que o PostgREST devolve em `error.code`. */
  code: string
  message: string
  details: string | null
  hint: string | null
}

export interface Resposta {
  data: Linha[] | null
  afetadas: number
  error: ErroSql | null
}

export function defineFase(def: DefinicaoFase): DefinicaoFase {
  return def
}

export function regraDe(fase: DefinicaoFase, tabela: string): Required<Pick<RegraTabela, 'ler' | 'chave'>> & RegraTabela {
  const regra = fase.gabarito[tabela]
  if (!regra) throw new Error(`A fase ${fase.id} não tem gabarito para a tabela "${tabela}".`)
  return typeof regra === 'function' ? { ler: regra, chave: 'id' } : { chave: 'id', ...regra }
}
