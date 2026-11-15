'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { banco } from '../jogo/banco'
import { faseDaTela, rotaDe, rotaDeVolta, type FaseDaTela } from '../jogo/fases'
import { estrelasPara, registrarVitoria } from '../jogo/progresso'
import { t } from '../jogo/t'
import type { ResultadoDaBateria, Teste } from '../motor/bateria'
import type { Chamada } from '../motor/chamada'
import type { GradeDaTabela } from '../motor/grade'
import type { ErroSql } from '../motor/tipos'
import { Editor } from './Editor'
import { Carregando, Dicas, ErroDoJogo, Estrelas, Texto, Topo } from './Pecas'

/** Com `ciclo`, esta tela é a segunda etapa do Ciclo completo: o ataque do jogador entra na bateria. */
export function TelaDefesa({ id, ciclo }: { id: string; ciclo?: { ataque: Chamada[]; dicasDoAtaque: number } }) {
  const fase = faseDaTela(id)
  const [sql, setSql] = useState(fase.defesaSql)
  const [grade, setGrade] = useState<GradeDaTabela[] | null>(null)
  const [erroSql, setErroSql] = useState<ErroSql | null>(null)
  const [erro, setErro] = useState('')
  const [bateria, setBateria] = useState<ResultadoDaBateria | null>(null)
  const [sqlDaBateria, setSqlDaBateria] = useState('')
  const [rodando, setRodando] = useState(false)
  const [dicas, setDicas] = useState(0)
  const dicasNoTotal = dicas + (ciclo?.dicasDoAtaque ?? 0)
  const estrelas = estrelasPara(dicasNoTotal)
  const venceu = bateria?.passou === true && sqlDaBateria === sql

  // A grade acompanha o que está no editor, com uma pausa para não rodar a cada tecla.
  const pedido = useRef(0)
  const atualizarGrade = useCallback(
    async (texto: string) => {
      const meu = ++pedido.current
      try {
        const r = await banco.avaliarDefesa(id, texto, false)
        if (meu !== pedido.current) return
        setErro('')
        setErroSql(r.erroSql)
        if (!r.erroSql) setGrade(r.grade)
      } catch (e) {
        if (meu === pedido.current) setErro((e as Error).message)
      }
    },
    [id],
  )
  useEffect(() => {
    const espera = setTimeout(() => void atualizarGrade(sql), grade === null ? 0 : 500)
    return () => clearTimeout(espera)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sql, atualizarGrade])

  const atual = useRef({ sql, dicasNoTotal, rodando, ciclo })
  atual.current = { sql, dicasNoTotal, rodando, ciclo }

  const rodarTestes = useCallback(async () => {
    if (atual.current.rodando) return
    setRodando(true)
    const texto = atual.current.sql
    const meu = ++pedido.current
    try {
      const r = await banco.avaliarDefesa(id, texto, true, atual.current.ciclo?.ataque)
      setErro('')
      setErroSql(r.erroSql)
      setBateria(r.bateria)
      setSqlDaBateria(texto)
      if (!r.erroSql && meu === pedido.current) setGrade(r.grade)
      if (r.bateria?.passou) registrarVitoria(id, atual.current.ciclo ? 'ciclo' : 'defesa', atual.current.dicasNoTotal)
    } catch (e) {
      setErro((e as Error).message)
    }
    setRodando(false)
  }, [id])

  return (
    <>
      <Topo faseId={id} titulo={fase.rotulo} modo={ciclo ? 'ciclo' : 'defesa'} estrelas={estrelas} etapa={ciclo && t('ciclo.etapaDefesa')} />
      <main className="fase">
        <div className="coluna">
          <section className="cartao borda-fria">
            <h2>{t('briefing.titulo')}</h2>
            <Texto markdown={fase.texto.briefingDaDefesa} />
            {ciclo && <p className="gradiente" style={{ fontWeight: 600, marginTop: 12 }}>{t('ciclo.seuAtaque', { n: ciclo.ataque.length })}</p>}
          </section>
          <Dicas dicas={fase.texto.dicasDaDefesa} abertas={dicas} aoAbrir={() => setDicas(dicas + 1)} modo="defesa" />
        </div>

        <div className="coluna">
          {venceu && (
            <section className="vitoria borda-fria" role="status">
              <Estrelas quantas={estrelas} />
              <h2 className="gradiente frio">{ciclo ? t('vitoria.ciclo') : t('vitoria.defesa')}</h2>
              <h3 className="fraco pequeno" style={{ marginBottom: 6 }}>
                {t('vitoria.explicacao')}
              </h3>
              <Texto markdown={fase.texto.explicacao} />
              <div className="acoes">
                {!ciclo && (
                  <Link className="botao borda-quente" href={rotaDe(id, 'ataque')}>
                    {t('vitoria.irParaAtaque')}
                  </Link>
                )}
                <Link className={ciclo ? 'botao borda-completa' : 'botao-liso'} href={rotaDeVolta(id)}>
                  {t('vitoria.voltar')}
                </Link>
              </div>
            </section>
          )}

          <section className="editor borda-fria">
            <header>
              <h2>{t('defesa.editor')}</h2>
              <button className="botao-liso" onClick={() => setSql(fase.defesaSql)} disabled={rodando || sql === fase.defesaSql}>
                {t('defesa.restaurar')}
              </button>
              <button className="botao borda-fria" onClick={rodarTestes} disabled={rodando}>
                {rodando ? t('defesa.rodando') : t('defesa.rodar')}
                <kbd>{t('ataque.atalho')}</kbd>
              </button>
            </header>
            <Editor valor={sql} aoMudar={setSql} aoExecutar={rodarTestes} linguagem="sql" rotulo={t('defesa.editor')} />
          </section>

          {erro && <ErroDoJogo mensagem={erro} aoTentar={() => void atualizarGrade(sql)} />}
          {erroSql && (
            <div className="aviso-erro" role="alert">
              <h3>{t('defesa.erroSql')}</h3>
              <p>
                {erroSql.code}: {erroSql.message}
              </p>
            </div>
          )}

          <div className="dupla">
            <section className="cartao">
              <header>
                <h2>{t('defesa.grade')}</h2>
                <span className="fraco pequeno">{t('defesa.gradeNota')}</span>
              </header>
              {grade === null && !erro ? <Carregando /> : grade?.map((g) => <Grade key={g.tabela} grade={g} fase={fase} />)}
            </section>

            <section className="cartao">
              <header>
                <h2>{t('defesa.testes')}</h2>
                {bateria && (
                  <span className={`selo ${bateria.passou ? 'ok' : 'erro'}`}>
                    {t('defesa.placar', { ok: bateria.testes.filter((x) => x.ok).length, total: bateria.testes.length })}
                  </span>
                )}
              </header>
              {!bateria && <p className="fraco">{t('defesa.testesVazio')}</p>}
              {bateria && sqlDaBateria !== sql && <p className="fraco pequeno">{t('defesa.sqlDesatualizado')}</p>}
              {bateria && (
                <>
                  <Grupo titulo={t('defesa.uso')} testes={bateria.testes.filter((x) => x.tipo === 'uso')} />
                  <Grupo titulo={t('defesa.ataques')} testes={bateria.testes.filter((x) => x.tipo === 'ataque')} />
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  )
}

function Grade({ grade, fase }: { grade: GradeDaTabela; fase: FaseDaTela }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="grade">
        <caption className="mono pequeno" style={{ textAlign: 'left', color: '#fff', padding: '0 0 6px 5px' }}>
          {grade.tabela}
        </caption>
        <thead>
          <tr>
            <td style={{ background: 'none' }} />
            {grade.chaves.map((chave) => (
              <th key={chave} scope="col">
                #{chave}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grade.usuarios.map((u) => (
            <tr key={u.nome}>
              <th scope="row">
                {u.nome}
                {fase.usuarios[u.nome] === 'voce' && <span className="fraco"> {t('comum.voce')}</span>}
              </th>
              {u.celulas.map((c, i) => {
                const errado = c.ve !== c.deveria
                const descricao = t(c.ve ? 'grade.ve' : 'grade.naoVe', { quem: u.nome, chave: grade.chaves[i]! }) + (errado ? t(c.ve ? 'grade.eNaoDeveria' : 'grade.eDeveria') : '')
                return (
                  <td key={i} className={errado ? 'errado' : c.ve ? 've' : undefined} title={descricao} aria-label={descricao}>
                    {c.ve ? '✓' : '·'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="legenda">
        <span>
          <i className="ve" /> {t('defesa.legendaVe')}
        </span>
        <span>
          <i /> {t('defesa.legendaNaoVe')}
        </span>
        <span>
          <i className="errado" /> {t('defesa.legendaErrado')}
        </span>
        <span className={`selo ${grade.divergencias ? 'erro' : 'ok'}`}>
          {grade.divergencias ? t('defesa.divergencias', { n: grade.divergencias }) : t('defesa.semDivergencia')}
        </span>
      </div>
    </div>
  )
}

function Grupo({ titulo, testes }: { titulo: string; testes: Teste[] }) {
  if (!testes.length) return null
  return (
    <>
      <h3 className="testes-grupo">{titulo}</h3>
      <ul className="testes">
        {testes.map((teste, i) => (
          <li key={i} className={teste.ok ? undefined : 'falhou'}>
            <b aria-label={t(teste.ok ? 'teste.passou' : 'teste.falhou')}>{teste.ok ? '✓' : '✗'}</b>
            <span>{teste.nome}</span>
            <small>{teste.detalhe}</small>
          </li>
        ))}
      </ul>
    </>
  )
}
