// O Worker do banco: aqui moram o PGlite e o motor. As telas só mandam pedidos.
import { abrirFase, criarBase, ErroNoSqlDoJogador, explorar, montarGrade, Partida, rodarBateria, usarPGlite, type AtaqueNomeado, type Sessao, type Snapshot } from '../motor'
import { t } from './t'
import { baseSql, versaoPGlite } from './fases.gerado'
import { pacoteDe } from './pacotes'
import type { AvaliacaoDaDefesa, Banco, Pedido, PoliticasDaTabela, Retorno, TabelaDoSchema } from './protocolo-banco'

const escopo = self as unknown as {
  location: { origin: string }
  postMessage(mensagem: Retorno): void
  onmessage: ((evento: { data: Pedido }) => void) | null
}

// O PGlite não entra no pacote do site: é um arquivo estático, importado em tempo de
// execução. O `new Function` impede o empacotador de tentar resolver o caminho.
const importar = new Function('caminho', 'return import(caminho)') as (caminho: string) => Promise<{ PGlite: Parameters<typeof usarPGlite>[0] }>

let base: Promise<Snapshot> | null = null
function pegarBase(): Promise<Snapshot> {
  return (base ??= importar(`${escopo.location.origin}/pglite-${versaoPGlite}/index.js`).then(({ PGlite }) => {
    usarPGlite(PGlite)
    return criarBase(baseSql)
  }))
}

const pacote = pacoteDe

const LIMITE_DE_CHAMADAS = 500

let sessao: Sessao | null = null
let partida: Partida | null = null

const banco: Banco = {
  async abrirAtaque(faseId) {
    await sessao?.fechar()
    sessao = partida = null
    sessao = await abrirFase(await pegarBase(), pacote(faseId), { sessao: 'jogador' })
    partida = new Partida(sessao)
    // O catálogo do Postgres é legível por qualquer papel, como o schema exposto pela API.
    const r = await sessao.db.query<{ tabela: string; coluna: string; tipo: string }>(`
      select c.relname as tabela, a.attname as coluna, format_type(a.atttypid, a.atttypmod) as tipo
        from pg_class c join pg_attribute a on a.attrelid = c.oid
       where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v')
         and a.attnum > 0 and not a.attisdropped
       order by c.relname, a.attnum`)
    const schema: TabelaDoSchema[] = []
    for (const linha of r.rows) {
      let tabela = schema.find((t) => t.nome === linha.tabela)
      if (!tabela) schema.push((tabela = { nome: linha.tabela, colunas: [] }))
      tabela.colunas.push({ nome: linha.coluna, tipo: linha.tipo })
    }
    const funcoes = await sessao.db.query<{ nome: string; argumentos: string }>(`
      select p.proname as nome, pg_get_function_identity_arguments(p.oid) as argumentos
        from pg_proc p where p.pronamespace = 'public'::regnamespace order by p.proname`)
    return { schema, funcoes: funcoes.rows }
  },

  async responder(valor) {
    if (!partida) throw new Error('A fase ainda não foi aberta.')
    const r = await partida.chamar({ tipo: 'resposta', valor })
    return { certo: (r.data as { certo: boolean }).certo, venceu: partida.venceu }
  },

  async chamar(chamada) {
    if (!partida) throw new Error('A fase ainda não foi aberta.')
    const resposta = await partida.chamar(chamada)
    return { resposta, venceu: partida.venceu, usuario: partida.usuario.nome }
  },

  async politicas() {
    if (!sessao) throw new Error('A fase ainda não foi aberta.')
    const tabelas = await sessao.db.query<{ tabela: string; rls: boolean }>(`
      select relname as tabela, relrowsecurity as rls from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname`)
    const politicas = await sessao.db.query<{ tabela: string; nome: string; comando: string; papeis: string; usando: string | null; checando: string | null }>(`
      select tablename as tabela, policyname as nome, cmd as comando, array_to_string(roles, ', ') as papeis,
             qual as usando, with_check as checando
        from pg_policies where schemaname = 'public' order by tablename, policyname`)
    // Além das políticas: como as views, as funções e as restrições foram criadas.
    const definicoes = await sessao.db.query<{ titulo: string; sql: string }>(`
      select 'view ' || c.relname as titulo,
             'create view public.' || c.relname ||
             case when c.reloptions is null then '' else ' with (' || array_to_string(c.reloptions, ', ') || ')' end ||
             E' as\n' || pg_get_viewdef(c.oid) as sql
        from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
      union all
      select 'função ' || p.proname, pg_get_functiondef(p.oid)
        from pg_proc p where p.pronamespace = 'public'::regnamespace
      union all
      select 'restrição em ' || c.relname, 'alter table public.' || c.relname || ' add constraint ' || k.conname || ' ' || pg_get_constraintdef(k.oid)
        from pg_constraint k join pg_class c on c.oid = k.conrelid
       where c.relnamespace = 'public'::regnamespace and k.contype = 'u'
       order by 1`)
    return {
      tabelas: tabelas.rows.map((linha): PoliticasDaTabela => ({
        tabela: linha.tabela,
        rlsLigado: linha.rls,
        politicas: politicas.rows.filter((p) => p.tabela === linha.tabela).map(({ tabela: _, ...resto }) => resto),
      })),
      definicoes: definicoes.rows,
    }
  },

  async ataqueDoJogador() {
    // Um laço pode ter gerado milhares de chamadas: as últimas bastam para refazer o ataque.
    return partida ? partida.historico.slice(-LIMITE_DE_CHAMADAS) : []
  },

  async explorar(sql) {
    return explorar(await pegarBase(), sql)
  },

  async avaliarDefesa(faseId, sql, comBateria, ataqueDoJogador): Promise<AvaliacaoDaDefesa> {
    const ataques: AtaqueNomeado[] = [{ nome: t('defesa.ataqueConhecido'), chamadas: pacote(faseId).ataqueGravado }]
    if (ataqueDoJogador?.length) ataques.push({ nome: t('defesa.ataqueSeu'), chamadas: ataqueDoJogador })
    let defesa: Sessao
    try {
      defesa = await abrirFase(await pegarBase(), pacote(faseId), { sessao: 'motor', sqlDoJogador: sql })
    } catch (e) {
      if (e instanceof ErroNoSqlDoJogador) return { erroSql: e.erro, grade: [], bateria: null }
      throw e
    }
    try {
      return { erroSql: null, grade: await montarGrade(defesa), bateria: comBateria ? await rodarBateria(defesa, ataques) : null }
    } finally {
      await defesa.fechar()
    }
  },
}

// Um pedido por vez: o PGlite tem uma conexão só, e a ordem das chamadas importa.
let fila: Promise<unknown> = Promise.resolve()
escopo.onmessage = ({ data: { id, metodo, args } }) => {
  fila = fila.then(async () => {
    try {
      const valor = await (banco[metodo] as (...a: unknown[]) => Promise<unknown>)(...args)
      escopo.postMessage({ id, ok: true, valor })
    } catch (e) {
      escopo.postMessage({ id, ok: false, erro: (e as Error).message ?? String(e) })
    }
  })
}
