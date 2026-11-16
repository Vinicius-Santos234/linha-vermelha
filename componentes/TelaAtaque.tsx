'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { rodarNoWorker } from '../cliente/rodar-no-worker'
import { banco } from '../jogo/banco'
import { descrever } from '../jogo/descrever'
import { faseDaTela, rotaDe, rotaDeVolta } from '../jogo/fases'
import { estrelasPara, registrarVitoria } from '../jogo/progresso'
import type { Definicao, FuncaoDoSchema, PoliticasDaTabela, TabelaDoSchema } from '../jogo/protocolo-banco'
import { t } from '../jogo/t'
import type { Chamada, RespostaCliente } from '../motor/chamada'
import { Editor } from './Editor'
import { Varredura } from './fundos/Varredura'
import { Carregando, Dicas, ErroDoJogo, Estrelas, Texto, Topo } from './Pecas'

type Entrada =
  | { tipo: 'chamada'; texto: string; resposta: RespostaCliente; usuario: string }
  | { tipo: 'console'; nivel: 'log' | 'info' | 'warn' | 'error'; texto: string }
  | { tipo: 'erro'; texto: string }

/** Com `ciclo`, esta tela é a primeira etapa do Ciclo completo: vencer leva à Defesa, com o ataque junto. */
export function TelaAtaque({ id, ciclo }: { id: string; ciclo?: { aoAvancar(ataque: Chamada[], dicas: number): void } }) {
  const fase = faseDaTela(id)
  const [estado, setEstado] = useState<'carregando' | 'pronta' | 'erro'>('carregando')
  const [erro, setErro] = useState('')
  const [schema, setSchema] = useState<TabelaDoSchema[]>([])
  const [funcoes, setFuncoes] = useState<FuncaoDoSchema[]>([])
  const [resposta, setResposta] = useState('')
  const [errou, setErrou] = useState(false)
  const sqlConsole = fase.console === 'sql'
  const [codigo, setCodigo] = useState(sqlConsole ? t('ataque.inicialSql') : t('ataque.inicial'))
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [executando, setExecutando] = useState(false)
  const [venceu, setVenceu] = useState(false)
  const [dicas, setDicas] = useState(0)
  const [politicas, setPoliticas] = useState<{ tabelas: PoliticasDaTabela[]; definicoes: Definicao[] } | null>(null)
  const estrelas = estrelasPara(dicas)

  const abrir = useCallback(async () => {
    setEstado('carregando')
    try {
      const { schema, funcoes } = await banco.abrirAtaque(id)
      setSchema(schema)
      setFuncoes(funcoes)
      setEntradas([])
      setVenceu(false)
      setEstado('pronta')
    } catch (e) {
      setErro((e as Error).message)
      setEstado('erro')
    }
  }, [id])

  useEffect(() => {
    void abrir()
  }, [abrir])

  // O valor mais novo sem recriar a função que o editor guarda.
  const atual = useRef({ codigo, dicas, executando, estado, emCiclo: !!ciclo, sqlConsole })
  atual.current = { codigo, dicas, executando, estado, emCiclo: !!ciclo, sqlConsole }

  const executar = useCallback(async () => {
    if (atual.current.executando || atual.current.estado !== 'pronta') return
    setExecutando(true)
    const novas: Entrada[] = []
    const mostrar = (entrada: Entrada) => {
      novas.push(entrada)
      setEntradas([...novas])
    }
    let ganhou = false
    // No nível 4 não há código do jogador para isolar: o texto é um comando SQL, que vai
    // direto ao motor.
    const rodarSql = async () => {
      try {
        const chamada = { tipo: 'sql' as const, texto: atual.current.codigo }
        const r = await banco.chamar(chamada)
        mostrar({ tipo: 'chamada', texto: descrever(chamada), resposta: r.resposta, usuario: r.usuario })
        if (r.venceu) ganhou = true
        return { erro: null }
      } catch (e) {
        return { erro: (e as Error).message }
      }
    }
    const resultado = await (atual.current.sqlConsole ? rodarSql() : rodarNoWorker(
      () => new Worker(new URL('../cliente/worker-jogador.ts', import.meta.url)),
      atual.current.codigo,
      {
        aoLogar: (nivel, texto) => mostrar({ tipo: 'console', nivel, texto }),
        responder: async (chamada) => {
          const r = await banco.chamar(chamada)
          mostrar({ tipo: 'chamada', texto: descrever(chamada), resposta: r.resposta, usuario: r.usuario })
          if (r.venceu) ganhou = true
          return r.resposta
        },
      },
    ))
    if (resultado.erro) mostrar({ tipo: 'erro', texto: resultado.erro })
    if (ganhou) {
      // No Ciclo a conquista só é registrada no fim, depois do conserto.
      if (!atual.current.emCiclo) registrarVitoria(id, 'ataque', atual.current.dicas)
      setVenceu(true)
    }
    setExecutando(false)
  }, [id])

  // Fase de descobrir: o jogador informa o valor que deduziu.
  const conferirResposta = async () => {
    if (!resposta.trim() || estado !== 'pronta') return
    const r = await banco.responder(resposta)
    setErrou(!r.certo)
    if (r.venceu) {
      if (!ciclo) registrarVitoria(id, 'ataque', dicas)
      setVenceu(true)
    }
  }

  const abrirDica = async () => {
    const proxima = dicas + 1
    setDicas(proxima)
    if (proxima === 2 && estado === 'pronta') setPoliticas(await banco.politicas().catch(() => null))
  }

  return (
    <>
      <Varredura cruzou={venceu} />
      <Topo faseId={id} titulo={fase.rotulo} modo={ciclo ? 'ciclo' : 'ataque'} estrelas={estrelas} etapa={ciclo && t('ciclo.etapaAtaque')} />
      <main className="fase">
        <div className="coluna">
          <section className="cartao borda-quente">
            <h2>{t('briefing.titulo')}</h2>
            <Texto markdown={fase.texto.briefingDoAtaque} />
          </section>

          <section className="cartao">
            <h2>{t('acesso.titulo')}</h2>
            <dl className="acesso">
              <dt>{t('acesso.email')}</dt>
              <dd>{fase.acesso.email}</dd>
              <dt>{t('acesso.senha')}</dt>
              <dd>{fase.acesso.senha}</dd>
            </dl>
            {sqlConsole && (
              <p className="fraco pequeno" style={{ marginTop: 10 }}>
                {t('acesso.sql')}
              </p>
            )}
          </section>

          <section className="cartao schema">
            <header>
              <h2>{t('schema.titulo')}</h2>
              <span className="fraco pequeno">{t('schema.nota')}</span>
            </header>
            {schema.map((tabela) => (
              <div key={tabela.nome}>
                <h3>{tabela.nome}</h3>
                <ul>
                  {tabela.colunas.map((c) => (
                    <li key={c.nome}>
                      <span>{c.nome}</span>
                      <span>{c.tipo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {funcoes.length > 0 && (
              <div>
                <h3>{t('schema.funcoes')}</h3>
                <ul>
                  {funcoes.map((f) => (
                    <li key={f.nome}>
                      <span>{f.nome}</span>
                      <span>({f.argumentos})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {fase.pedeResposta && !venceu && (
            <section className="cartao borda-quente">
              <h2>{t('resposta.titulo')}</h2>
              <p className="fraco pequeno">{t('resposta.texto')}</p>
              <form
                className="resposta"
                onSubmit={(e) => {
                  e.preventDefault()
                  void conferirResposta()
                }}
              >
                <input value={resposta} onChange={(e) => setResposta(e.target.value)} aria-label={t('resposta.campo')} placeholder={t('resposta.campo')} autoComplete="off" spellCheck={false} />
                <button className="botao borda-quente" disabled={estado !== 'pronta'}>
                  {t('resposta.conferir')}
                </button>
              </form>
              {errou && (
                <p className="erro-texto" role="alert" style={{ marginTop: 10 }}>
                  {t('resposta.errado')}
                </p>
              )}
            </section>
          )}

          <Dicas
            dicas={fase.texto.dicasDoAtaque}
            abertas={dicas}
            aoAbrir={abrirDica}
            modo="ataque"
            extra={politicas && <Politicas politicas={politicas} />}
          />
        </div>

        <div className="coluna">
          {venceu && (
            <section className="vitoria borda-quente" role="status">
              <Estrelas quantas={estrelas} />
              <h2 className="gradiente quente">{t('vitoria.ataque')}</h2>
              <h3 className="fraco pequeno" style={{ marginBottom: 6 }}>
                {t('vitoria.explicacao')}
              </h3>
              <Texto markdown={fase.texto.explicacao} />
              <div className="acoes">
                {ciclo ? (
                  <button className="botao borda-fria" onClick={async () => ciclo.aoAvancar(await banco.ataqueDoJogador(), dicas)}>
                    {t('ciclo.avancar')}
                  </button>
                ) : (
                  <Link className="botao borda-fria" href={rotaDe(id, 'defesa')}>
                    {t('vitoria.irParaDefesa')}
                  </Link>
                )}
                <Link className="botao-liso" href={rotaDeVolta(id)}>
                  {t('vitoria.voltar')}
                </Link>
              </div>
            </section>
          )}

          <section className="editor borda-quente">
            <header>
              <h2>{sqlConsole ? t('ataque.editorSql') : t('ataque.editor')}</h2>
              <a className="botao-liso" href="/ajuda/" target="_blank" rel="noreferrer">
                {t('ajuda.titulo')}
              </a>
              <button className="botao-liso" onClick={abrir} disabled={executando}>
                {t('ataque.recomecar')}
              </button>
              <button className="botao borda-quente" onClick={executar} disabled={executando || estado !== 'pronta'}>
                {executando ? t('ataque.executando') : t('ataque.executar')}
                <kbd>{t('ataque.atalho')}</kbd>
              </button>
            </header>
            <Editor valor={codigo} aoMudar={setCodigo} aoExecutar={executar} linguagem={sqlConsole ? 'sql' : 'js'} rotulo={sqlConsole ? t('ataque.editorSql') : t('ataque.editor')} />
          </section>

          <section className="cartao">
            <h2>{t('ataque.saida')}</h2>
            {estado === 'carregando' && <Carregando />}
            {estado === 'erro' && <ErroDoJogo mensagem={erro} aoTentar={abrir} />}
            {estado === 'pronta' && entradas.length === 0 && <p className="fraco">{t('ataque.saidaVazia')}</p>}
            <div className="saida" aria-live="polite">
              {entradas.map((entrada, i) => (
                <Saida key={i} entrada={entrada} />
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

function Saida({ entrada }: { entrada: Entrada }) {
  if (entrada.tipo === 'console') return <div className={`linha-console ${entrada.nivel}`}>{entrada.texto}</div>
  if (entrada.tipo === 'erro') {
    return (
      <div className="entrada com-erro">
        <div className="corpo erro-texto">{entrada.texto}</div>
      </div>
    )
  }
  const { data, error } = entrada.resposta
  return (
    <div className={`entrada${error ? ' com-erro' : ''}`}>
      <div className="chamada">
        <span>{entrada.texto}</span>
        <small>{t('ataque.logadoComo', { quem: entrada.usuario })}</small>
      </div>
      <div className="corpo">
        {error ? (
          <div className="erro-texto">
            {error.code}: {error.message}
            {error.details ? `\n${error.details}` : ''}
          </div>
        ) : (
          <Dados dados={data} />
        )}
      </div>
    </div>
  )
}

const valor = (v: unknown) => (v === null ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v))

function Dados({ dados }: { dados: unknown }) {
  if (dados === null || dados === undefined) return <span className="fraco pequeno">{t('ataque.semDados')}</span>
  const linhas = Array.isArray(dados) ? dados : null
  const tabular = linhas && linhas.length > 0 && linhas.every((l) => l !== null && typeof l === 'object' && !Array.isArray(l))
  if (!tabular) return <pre style={{ border: 0, padding: 0, background: 'none' }}>{JSON.stringify(dados, null, 2)}</pre>
  const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l as object)))]
  return (
    <>
      <table className="dados">
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.slice(0, 100).map((linha, i) => (
            <tr key={i}>
              {colunas.map((c) => {
                const v = (linha as Record<string, unknown>)[c]
                return (
                  <td key={c} className={v === null ? 'nulo' : undefined}>
                    {valor(v)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="fraco pequeno" style={{ marginTop: 8 }}>
        {t('ataque.linhas', { n: linhas.length })}
      </p>
    </>
  )
}

function Politicas({ politicas }: { politicas: { tabelas: PoliticasDaTabela[]; definicoes: Definicao[] } }) {
  return (
    <div className="politicas" style={{ marginTop: 12 }}>
      {politicas.tabelas.map((tabela) => (
        <div key={tabela.tabela}>
          <h3>
            {tabela.tabela}
            <span className={`selo ${tabela.rlsLigado ? 'ok' : 'erro'}`}>{tabela.rlsLigado ? t('politicas.rlsLigado') : t('politicas.rlsDesligado')}</span>
          </h3>
          {tabela.politicas.length === 0 ? (
            <p className="fraco pequeno">{t('politicas.nenhuma')}</p>
          ) : (
            <pre>
              {tabela.politicas
                .map((p) => `${p.nome}  ${p.comando}  to ${p.papeis}${p.usando ? `\n  using (${p.usando})` : ''}${p.checando ? `\n  with check (${p.checando})` : ''}`)
                .join('\n\n')}
            </pre>
          )}
        </div>
      ))}
      {politicas.definicoes.map((d) => (
        <div key={d.titulo}>
          <h3>{d.titulo}</h3>
          <pre>{d.sql}</pre>
        </div>
      ))}
    </div>
  )
}
