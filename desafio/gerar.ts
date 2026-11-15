// O desafio diário. A data vira a semente de um sorteio que escolhe uma família de falha,
// um cenário, os dados e a linha-alvo, e monta a fase inteira: tabelas, políticas furadas,
// gabarito, ataque e conserto. É uma função pura: o mesmo dia dá o mesmo desafio para
// todo mundo, sem servidor.
import type { Chamada } from '../motor/chamada'
import type { DefinicaoFase, Regra } from '../motor/tipos'
import conteudo from './conteudo.pt-BR.json'

export const FAMILIAS = [
  'rls-desligado',
  'politica-provisoria',
  'linhas-orfas',
  'metadata-do-usuario',
  'politicas-que-somam',
  'coluna-sem-vigia',
  'view-que-ignora-rls',
  'funcao-que-confia-no-parametro',
] as const
export type Familia = (typeof FAMILIAS)[number]
export type Cenario = (typeof conteudo.cenarios)[number]
export const CENARIOS: Cenario[] = conteudo.cenarios

export interface Desafio {
  id: string
  /** AAAA-MM-DD. */
  data: string
  familia: Familia
  cenario: Cenario
  def: DefinicaoFase
  setupSql: string
  politicasSql: string
  solucaoSql: string
  /** O ataque de referência, já como chamadas. */
  ataque: Chamada[]
  /** No mesmo formato do pt-BR.md das fases fixas. */
  texto: string
}

const ALICE = 'a11ce000-0000-4000-8000-000000000001'
const BRUNO = 'b0b00000-0000-4000-8000-000000000002'
const CARLA = 'ca51a000-0000-4000-8000-000000000003'
const ACESSO = { email: 'alice@exemplo.com', senha: 'paodequeijo' }
const ENTRAR: Chamada = { tipo: 'auth', metodo: 'signInWithPassword', email: ACESSO.email, senha: ACESSO.senha }
const ENTRAR_JS = `await supabase.auth.signInWithPassword({\n  email: '${ACESSO.email}', password: '${ACESSO.senha}',\n})`

// ---------- sorteio ----------

/** Um gerador pseudoaleatório pequeno e determinístico (mulberry32). */
function sorteio(semente: string) {
  let a = 2166136261
  for (const letra of semente) a = Math.imul(a ^ letra.charCodeAt(0), 16777619)
  const proximo = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const inteiro = (ate: number) => Math.floor(proximo() * ate)
  return {
    inteiro,
    um: <T>(lista: readonly T[]): T => lista[inteiro(lista.length)]!,
    embaralhar: <T>(lista: readonly T[]): T[] => {
      const copia = [...lista]
      for (let i = copia.length - 1; i > 0; i--) {
        const j = inteiro(i + 1)
        ;[copia[i], copia[j]] = [copia[j]!, copia[i]!]
      }
      return copia
    },
  }
}

/** Dias corridos desde 01/01/2026. */
export function numeroDoDia(data: string): number {
  return Math.round((Date.parse(`${data}T00:00:00Z`) - Date.parse('2026-01-01T00:00:00Z')) / 86_400_000)
}

/**
 * A família do dia. A cada bloco de oito dias todas aparecem uma vez, em ordem sorteada,
 * e a primeira de um bloco nunca repete a última do anterior.
 */
export function familiaDoDia(data: string): Familia {
  const dia = numeroDoDia(data)
  const bloco = Math.floor(dia / FAMILIAS.length)
  const ordem = (b: number) => sorteio(`bloco-${b}`).embaralhar(FAMILIAS)
  const atual = ordem(bloco)
  if (atual[0] === ordem(bloco - 1).at(-1)) [atual[0], atual[1]] = [atual[1]!, atual[0]!]
  return atual[((dia % FAMILIAS.length) + FAMILIAS.length) % FAMILIAS.length]!
}

/** A data de hoje no fuso de quem joga, em AAAA-MM-DD. */
export function hoje(agora = new Date()): string {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

// ---------- peças de SQL ----------

const texto = (valor: string) => `'${valor.replace(/'/g, "''")}'`
const dono: Regra = (linha, usuario) => usuario.id !== null && linha.user_id === usuario.id

interface Linha {
  id: number
  dono: string | null
  a: string
  b: string
}

function usuariosSql(meta: Partial<Record<'alice' | 'bruno' | 'carla', { usuario?: object; app?: object }>> = {}): string {
  const linha = (id: string, email: string, senha: string, m?: { usuario?: object; app?: object }) =>
    `  ('${id}', '${email}', '${senha}', now(), '${JSON.stringify(m?.usuario ?? {})}', '${JSON.stringify(m?.app ?? {})}')`
  return `insert into auth.users (id, email, senha, email_confirmed_at, raw_user_meta_data, raw_app_meta_data) values
${linha(ALICE, 'alice@exemplo.com', 'paodequeijo', meta.alice)},
${linha(BRUNO, 'bruno@exemplo.com', 'tR7#kq9!vLx2', meta.bruno)},
${linha(CARLA, 'carla@exemplo.com', 'Zx8$mNp2@wQ5', meta.carla)};`
}

function tabelaSql(c: Cenario, linhas: Linha[], semDono = false): string {
  const [a, b] = c.colunas as [string, string]
  return `create table public.${c.tabela} (
  id      int primary key,
  user_id uuid ${semDono ? '' : 'not null '}references auth.users (id),
  ${a} text not null,
  ${b} text not null
);

insert into public.${c.tabela} (id, user_id, ${a}, ${b}) values
${linhas.map((l) => `  (${l.id}, ${l.dono ? `'${l.dono}'` : 'null'}, ${texto(l.a)}, ${texto(l.b)})`).join(',\n')};`
}

const politicaDoDono = (tabela: string) => `create policy ${tabela}_do_dono on public.${tabela}
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());`

const rlsDoDono = (tabela: string) => `alter table public.${tabela} enable row level security;

${politicaDoDono(tabela)}`

// ---------- as famílias ----------

interface Pecas {
  nivel: 1 | 2 | 3
  usuarios: DefinicaoFase['usuarios']
  setupSql: string
  politicasSql: string
  solucaoSql: string
  gabarito: DefinicaoFase['gabarito']
  objetivo: DefinicaoFase['objetivo']
  usos?: DefinicaoFase['usos']
  ataque: Chamada[]
  ataqueJs: string
  /** Na família das linhas órfãs, o alvo não é do Bruno. */
  alvoDeVisitante?: boolean
}

type Receita = (c: Cenario, linhas: Linha[], alvo: Linha) => Pecas

const ler = (tabela: string): Chamada => ({ tipo: 'from', tabela, operacao: 'select', colunas: '*', filtros: [] })
const padrao = { alice: 'voce', bruno: 'vitima' } as const

const RECEITAS: Record<Familia, Receita> = {
  'rls-desligado': (c, linhas, alvo) => ({
    nivel: 1,
    usuarios: padrao,
    setupSql: `${usuariosSql()}\n\n${tabelaSql(c, linhas)}`,
    politicasSql: `-- A tabela public.${c.tabela}, como está hoje:\n--   RLS: desligado\n--   Políticas: nenhuma\n--\n-- Escreva aqui o SQL que conserta.\n`,
    solucaoSql: rlsDoDono(c.tabela),
    gabarito: { [c.tabela]: { ler: dono, alterar: dono, apagar: dono } },
    objetivo: { tipo: 'ler', tabela: c.tabela, id: alvo.id },
    ataque: [ler(c.tabela)],
    ataqueJs: `console.log(await supabase.from('${c.tabela}').select())`,
  }),

  'politica-provisoria': (c, linhas, alvo) => ({
    nivel: 1,
    usuarios: padrao,
    setupSql: `${usuariosSql()}\n\n${tabelaSql(c, linhas)}`,
    politicasSql: `alter table public.${c.tabela} enable row level security;

-- TODO: provisória, só para o protótipo funcionar. Trocar antes de publicar.
create policy provisoria on public.${c.tabela}
  for all to authenticated
  using (true)
  with check (true);
`,
    solucaoSql: rlsDoDono(c.tabela),
    gabarito: { [c.tabela]: { ler: dono, alterar: dono, apagar: dono } },
    objetivo: { tipo: 'ler', tabela: c.tabela, id: alvo.id },
    ataque: [ENTRAR, ler(c.tabela)],
    ataqueJs: `${ENTRAR_JS}\nconsole.log(await supabase.from('${c.tabela}').select())`,
  }),

  'linhas-orfas': (c, linhas, alvo) => ({
    nivel: 1,
    usuarios: { alice: 'voce', bruno: 'cliente' },
    setupSql: `${usuariosSql()}\n\n${tabelaSql(c, linhas, true)}`,
    politicasSql: `alter table public.${c.tabela} enable row level security;

-- Registro de quem não tem conta fica sem dono: o user_id é vazio.
-- Por isso a política aceita também as linhas sem dono.
create policy ${c.tabela}_do_dono on public.${c.tabela}
  for all
  using (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid());
`,
    solucaoSql: rlsDoDono(c.tabela),
    gabarito: { [c.tabela]: { ler: dono, alterar: dono, apagar: dono } },
    objetivo: { tipo: 'ler', tabela: c.tabela, id: alvo.id },
    ataque: [{ ...ler(c.tabela), filtros: [{ coluna: 'user_id', op: 'is', valor: null }] } as Chamada],
    ataqueJs: `console.log(await supabase.from('${c.tabela}').select().is('user_id', null))`,
    alvoDeVisitante: true,
  }),

  'metadata-do-usuario': (c, linhas, alvo) => {
    const politicas = (bloco: string) => `${rlsDoDono(c.tabela)}

-- Quem é gerente vê tudo. O papel vem do token de login.
create policy gerente_ve_tudo on public.${c.tabela}
  for select to authenticated
  using (auth.jwt() -> '${bloco}' ->> 'papel' = 'gerente');
`
    const cliente = { usuario: { papel: 'cliente' }, app: { papel: 'cliente' } }
    return {
      nivel: 2,
      usuarios: { alice: 'voce', bruno: 'vitima', carla: 'gerente' },
      setupSql: `${usuariosSql({ alice: cliente, bruno: cliente, carla: { usuario: { papel: 'gerente' }, app: { papel: 'gerente' } } })}\n\n${tabelaSql(c, linhas)}`,
      politicasSql: politicas('user_metadata'),
      solucaoSql: politicas('app_metadata'),
      gabarito: { [c.tabela]: { ler: (l, u) => dono(l, u) || u.app_metadata.papel === 'gerente', alterar: dono, apagar: dono } },
      objetivo: { tipo: 'ler', tabela: c.tabela, id: alvo.id },
      ataque: [ENTRAR, { tipo: 'auth', metodo: 'updateUser', dados: { papel: 'gerente' } }, ler(c.tabela)],
      ataqueJs: `${ENTRAR_JS}\nawait supabase.auth.updateUser({ data: { papel: 'gerente' } })\nconsole.log(await supabase.from('${c.tabela}').select())`,
    }
  },

  'politicas-que-somam': (c, linhas, alvo) => {
    const politicas = (restritiva: boolean) => `${rlsDoDono(c.tabela)}

-- Reforço de segurança: só para conta com verificação em duas etapas.
create policy so_verificados on public.${c.tabela}${restritiva ? '\n  as restrictive' : ''}
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'verificado')::boolean);
`
    return {
      nivel: 3,
      usuarios: { alice: 'voce', bruno: 'vitima', carla: 'sem-verificacao' },
      setupSql: `-- Alice e Bruno ativaram a verificação em duas etapas. A Carla ainda não.\n${usuariosSql({ alice: { app: { verificado: true } }, bruno: { app: { verificado: true } }, carla: { app: { verificado: false } } })}\n\n${tabelaSql(c, [...linhas, { id: alvo.id + 40, dono: CARLA, a: linhas[0]!.a, b: linhas[0]!.b }])}`,
      politicasSql: politicas(false),
      solucaoSql: politicas(true),
      gabarito: { [c.tabela]: { ler: (l, u) => dono(l, u) && u.app_metadata.verificado === true } },
      objetivo: { tipo: 'ler', tabela: c.tabela, id: alvo.id },
      ataque: [ENTRAR, ler(c.tabela)],
      ataqueJs: `${ENTRAR_JS}\nconsole.log(await supabase.from('${c.tabela}').select())`,
    }
  },

  'coluna-sem-vigia': (c, linhas, alvo) => {
    const politicas = `alter table public.perfis enable row level security;
alter table public.${c.tabela} enable row level security;

-- Perfis: cada pessoa vê e edita o próprio.
create policy perfil_ver on public.perfis
  for select to authenticated
  using (id = auth.uid());

create policy perfil_editar on public.perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- O dono mexe no que é seu, e quem é admin vê tudo.
${politicaDoDono(c.tabela)}

create policy admin_ve_tudo on public.${c.tabela}
  for select to authenticated
  using (exists (select 1 from public.perfis p where p.id = auth.uid() and p.is_admin));
`
    return {
      nivel: 2,
      usuarios: { alice: 'voce', bruno: 'vitima', carla: 'admin' },
      setupSql: `${usuariosSql()}

create table public.perfis (
  id       uuid primary key references auth.users (id),
  nome     text not null,
  is_admin boolean not null default false
);

insert into public.perfis (id, nome, is_admin) values
  ('${ALICE}', 'Alice', false),
  ('${BRUNO}', 'Bruno', false),
  ('${CARLA}', 'Carla', true);

${tabelaSql(c, linhas)}`,
      politicasSql: politicas,
      solucaoSql: `${politicas}
-- O RLS decide QUAIS LINHAS. Quem decide QUAIS COLUNAS é o grant.
revoke update on public.perfis from anon, authenticated;
grant update (nome) on public.perfis to authenticated;
`,
      gabarito: {
        [c.tabela]: { ler: (l, u) => dono(l, u) || u.nome === 'carla', alterar: dono, apagar: dono },
        perfis: { ler: (l, u) => u.id !== null && l.id === u.id, alterar: (l, u) => u.id !== null && l.id === u.id, alterarColuna: 'nome', apagar: () => false },
      },
      objetivo: { tipo: 'ler', tabela: c.tabela, id: alvo.id },
      ataque: [
        ENTRAR,
        { tipo: 'from', tabela: 'perfis', operacao: 'update', valores: { is_admin: true }, filtros: [{ coluna: 'id', op: 'eq', valor: ALICE }] },
        ler(c.tabela),
      ],
      ataqueJs: `const { data } = ${ENTRAR_JS}\nawait supabase.from('perfis').update({ is_admin: true }).eq('id', data.user.id)\nconsole.log(await supabase.from('${c.tabela}').select())`,
    }
  },

  'view-que-ignora-rls': (c, linhas, alvo) => {
    const view = `${c.tabela}_resumo`
    const [a] = c.colunas as [string, string]
    const criacao = `create view public.${view} as\n  select id, user_id, ${a} from public.${c.tabela};`
    return {
      nivel: 3,
      usuarios: padrao,
      setupSql: `${usuariosSql()}\n\n${tabelaSql(c, linhas)}\n\n-- O resumo que a tela inicial do app consulta.\n${criacao}`,
      politicasSql: `${rlsDoDono(c.tabela)}

-- A view public.${view} já existe. Ela foi criada assim:
--
${criacao
  .split('\n')
  .map((l) => `--   ${l}`)
  .join('\n')}
`,
      solucaoSql: `${rlsDoDono(c.tabela)}\n\nalter view public.${view} set (security_invoker = true);\n`,
      gabarito: { [c.tabela]: { ler: dono, alterar: dono, apagar: dono }, [view]: { ler: dono } },
      objetivo: { tipo: 'ler', tabela: c.tabela, id: alvo.id, tambemPor: [view] },
      ataque: [ENTRAR, ler(view)],
      ataqueJs: `${ENTRAR_JS}\nconsole.log(await supabase.from('${view}').select())`,
    }
  },

  'funcao-que-confia-no-parametro': (c, linhas, alvo) => {
    const funcao = `${c.tabela}_do_usuario`
    const politicas = (modo: 'definer' | 'invoker') => `${rlsDoDono(c.tabela)}

alter table public.avaliacoes enable row level security;

-- Avaliação é pública: qualquer um lê.
create policy avaliacoes_publicas on public.avaliacoes
  for select
  using (true);

-- O histórico de uma pessoa, para a tela "Meu histórico".
create function public.${funcao}(uid uuid) returns setof public.${c.tabela}
  language sql stable
  security ${modo}
  set search_path = ''
as $$
  select * from public.${c.tabela} where user_id = uid order by id
$$;
`
    return {
      nivel: 3,
      usuarios: padrao,
      setupSql: `${usuariosSql()}

${tabelaSql(c, linhas)}

-- As avaliações são públicas de propósito, e mostram quem avaliou.
create table public.avaliacoes (
  id      int primary key,
  user_id uuid not null references auth.users (id),
  nome    text not null,
  texto   text not null
);

insert into public.avaliacoes (id, user_id, nome, texto) values
  (1, '${ALICE}', 'Alice', 'Atendimento rápido.'),
  (2, '${BRUNO}', 'Bruno', 'Recomendo de olhos fechados.');`,
      politicasSql: politicas('definer'),
      solucaoSql: politicas('invoker'),
      gabarito: { [c.tabela]: { ler: dono, alterar: dono, apagar: dono }, avaliacoes: { ler: () => true } },
      objetivo: { tipo: 'ler', tabela: c.tabela, id: alvo.id, tambemPor: [funcao] },
      usos: [{ nome: `alice continua vendo o próprio histórico pela função`, como: 'alice', chamada: { tipo: 'rpc', nome: funcao, args: { uid: ALICE } }, espera: 'linhas' }],
      ataque: [
        ENTRAR,
        { tipo: 'from', tabela: 'avaliacoes', operacao: 'select', colunas: 'user_id', filtros: [{ coluna: 'nome', op: 'eq', valor: 'Bruno' }], unica: 'single' },
        { tipo: 'rpc', nome: funcao, args: { uid: BRUNO } },
      ],
      ataqueJs: `${ENTRAR_JS}\nconst { data } = await supabase.from('avaliacoes').select('user_id').eq('nome', 'Bruno').single()\nconsole.log(await supabase.rpc('${funcao}', { uid: data.user_id }))`,
    }
  },
}

// ---------- o gerador ----------

const preencher = (modelo: string, valores: Record<string, string | number>) => modelo.replace(/\{(\w+)\}/g, (_, nome: string) => String(valores[nome] ?? `{${nome}}`))
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * O desafio de um dia. As opções existem para os testes cobrirem toda combinação de
 * família e cenário; o jogo só passa a data.
 */
export function gerarDesafio(data: string, forcar: { familia?: Familia; cenario?: string } = {}): Desafio {
  const r = sorteio(`linha-vermelha:${data}`)
  const familia = forcar.familia ?? familiaDoDia(data)
  const cenario = (forcar.cenario ? CENARIOS.find((c) => c.id === forcar.cenario) : undefined) ?? r.um(CENARIOS)

  // Quatro linhas, duas da Alice e duas do Bruno, em ordem sorteada. Nas linhas órfãs, as
  // duas últimas ficam sem dono, e o alvo é uma delas.
  const orfas = familia === 'linhas-orfas'
  const base = 10 * (1 + r.inteiro(8))
  const comuns = r.embaralhar(cenario.linhas)
  const segredo = r.um(cenario.segredos) as [string, string]
  const donos = orfas ? r.embaralhar([ALICE, BRUNO, null, null]) : r.embaralhar([ALICE, ALICE, BRUNO, BRUNO])
  const linhas: Linha[] = donos.map((quem, i) => ({ id: base + 1 + i, dono: quem, a: comuns[i]![0]!, b: comuns[i]![1]! }))
  const alvo = r.um(linhas.filter((l) => l.dono === (orfas ? null : BRUNO)))
  alvo.a = segredo[0]
  alvo.b = segredo[1]

  const pecas = RECEITAS[familia](cenario, linhas, alvo)
  const f = conteudo.familias[familia]
  const g = conteudo.geral
  const [, mes, dia] = data.split('-')
  const v = { app: cenario.app, tabela: cenario.tabela, um: cenario.um, Um: maiuscula(cenario.um), varios: cenario.varios, Varios: maiuscula(cenario.varios), id: alvo.id, dia: `${dia}/${mes}` }
  const regra = 'regra' in f ? f.regra : g.regraDono

  const texto = `# ${preencher(g.titulo, v)}

## Resumo
${preencher(g.resumo, v)}

## Briefing do ataque
${preencher(f.contexto, v)}

${preencher(g.voce, v)} ${preencher(pecas.alvoDeVisitante ? g.alvoDeVisitante : g.alvoDoBruno, v)}

${preencher(g.objetivo, v)}

## Briefing da defesa
${preencher(f.defesa0, v)} ${preencher(g.defesa, { ...v, regra })}

## Dicas do ataque
1. ${preencher(f.ataque1, v)}

2. ${g.dica2} ${preencher(f.ataque2, v)}

3. ${g.dica3Ataque}

\`\`\`js
${pecas.ataqueJs}
\`\`\`

## Dicas da defesa
1. ${preencher(f.defesa1, v)}

2. ${preencher(f.defesa2, v)}

3. ${g.dica3Defesa}

\`\`\`sql
${pecas.solucaoSql.trim()}
\`\`\`

## Explicação
${preencher(f.explicacao, v)}
`

  return {
    id: `diario-${data}`,
    data,
    familia,
    cenario,
    def: {
      id: `diario-${data}`,
      nivel: pecas.nivel,
      console: 'supabase-js',
      usuarios: pecas.usuarios,
      acesso: ACESSO,
      objetivo: pecas.objetivo,
      gabarito: pecas.gabarito,
      usos: pecas.usos,
    },
    setupSql: pecas.setupSql,
    politicasSql: pecas.politicasSql,
    solucaoSql: pecas.solucaoSql,
    ataque: pecas.ataque,
    texto,
  }
}
