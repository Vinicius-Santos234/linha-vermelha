'use client'

import { useEffect, useRef, useState } from 'react'
import { banco } from '../jogo/banco'
import { fases } from '../jogo/fases'
import { lerProgresso } from '../jogo/progresso'
import { t } from '../jogo/t'
import type { Exploracao, TabelaExplorada } from '../motor/laboratorio'
import { Editor } from './Editor'
import { Osciloscopio } from './fundos/Osciloscopio'
import { Carregando, ErroDoJogo, Navegacao } from './Pecas'

const valor = (v: unknown) => (v === null ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v))

/** O playground: sem objetivo e sem estrelas. Escolha o usuário e veja o que ele enxerga. */
export function TelaLaboratorio() {
  const [sql, setSql] = useState(t('lab.inicial'))
  const [resultado, setResultado] = useState<Exploracao | null>(null)
  const [erro, setErro] = useState('')
  const [quem, setQuem] = useState('anon')
  const [vencidas, setVencidas] = useState<string[]>([])

  useEffect(() => {
    const progresso = lerProgresso()
    setVencidas(fases.filter((f) => Object.keys(progresso[f.id] ?? {}).length > 0).map((f) => f.id))
  }, [])

  const pedido = useRef(0)
  const explorar = async (texto: string) => {
    const meu = ++pedido.current
    try {
      const r = await banco.explorar(texto)
      if (meu !== pedido.current) return
      setErro('')
      // Com erro de SQL, a última visão boa continua na tela.
      setResultado((anterior) => (r.erroSql && anterior ? { ...anterior, erroSql: r.erroSql } : r))
    } catch (e) {
      if (meu === pedido.current) setErro((e as Error).message)
    }
  }
  const primeira = useRef(true)
  useEffect(() => {
    const espera = setTimeout(() => void explorar(sql), primeira.current ? 0 : 500)
    primeira.current = false
    return () => clearTimeout(espera)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sql])

  const usuarios = resultado?.usuarios ?? []
  const escolhido = usuarios.includes(quem) ? quem : (usuarios.at(-1) ?? 'anon')

  return (
    <>
      <Osciloscopio sinais={usuarios.length || 3} />
      <Navegacao atual="laboratorio" />
      <main className="fase laboratorio">
        <div className="coluna">
          <section className="editor borda-completa">
            <header>
              <h2>{t('lab.editor')}</h2>
              <label className="fraco pequeno" htmlFor="carregar">
                {t('lab.carregar')}
              </label>
              <select
                id="carregar"
                className="seletor"
                value=""
                onChange={(e) => {
                  const fase = fases.find((f) => f.id === e.target.value)
                  setSql(fase ? fase.sqlCompleto : t('lab.inicial'))
                }}
              >
                <option value="" disabled>
                  …
                </option>
                <option value="em-branco">{t('lab.emBranco')}</option>
                {fases
                  .filter((f) => vencidas.includes(f.id))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {t('lab.faseVencida', { n: f.numero, titulo: f.texto.titulo })}
                    </option>
                  ))}
              </select>
            </header>
            <Editor valor={sql} aoMudar={setSql} aoExecutar={() => void explorar(sql)} linguagem="sql" rotulo={t('lab.editor')} />
          </section>
          {resultado?.erroSql && (
            <div className="aviso-erro" role="alert">
              <h3>{t('defesa.erroSql')}</h3>
              <p>
                {resultado.erroSql.code}: {resultado.erroSql.message}
              </p>
            </div>
          )}
        </div>

        <div className="coluna">
          {erro && <ErroDoJogo mensagem={erro} aoTentar={() => void explorar(sql)} />}
          {!resultado && !erro && <Carregando />}
          {resultado && (
            <>
              <section className="cartao">
                <header>
                  <h2>{t('lab.comoQuem')}</h2>
                  <span className="fraco pequeno">{t('lab.nota')}</span>
                </header>
                <div className="chips" role="radiogroup" aria-label={t('lab.comoQuem')}>
                  {usuarios.map((u) => (
                    <button key={u} role="radio" aria-checked={u === escolhido} className={u === escolhido ? 'chip borda-completa' : 'chip'} onClick={() => setQuem(u)}>
                      {u}
                    </button>
                  ))}
                </div>
              </section>
              {resultado.tabelas.length === 0 && <p className="fraco">{t('lab.semTabelas')}</p>}
              {resultado.tabelas.map((tabela) => (
                <Tabela key={tabela.nome} tabela={tabela} quem={escolhido} />
              ))}
            </>
          )}
        </div>
      </main>
    </>
  )
}

function Tabela({ tabela, quem }: { tabela: TabelaExplorada; quem: string }) {
  const visiveis = new Set(tabela.visiveis[quem] ?? [])
  return (
    <section className="cartao">
      <header>
        <h2 className="mono" style={{ textTransform: 'none', letterSpacing: 0, color: '#fff' }}>
          {tabela.nome}
        </h2>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`selo ${tabela.rlsLigado ? 'ok' : 'erro'}`}>{tabela.rlsLigado ? t('politicas.rlsLigado') : t('politicas.rlsDesligado')}</span>
          <span className="fraco pequeno">{t('lab.ve', { n: visiveis.size, total: tabela.linhas.length })}</span>
        </span>
      </header>
      {tabela.linhas.length === 0 ? (
        <p className="fraco">{t('lab.semLinhas')}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="dados">
            <thead>
              <tr>
                {tabela.colunas.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.linhas.map((linha, i) => (
                <tr key={i} className={visiveis.has(i) ? undefined : 'escondida'} aria-label={visiveis.has(i) ? undefined : t('lab.naoVe')}>
                  {tabela.colunas.map((c) => (
                    <td key={c} className={linha[c] === null ? 'nulo' : undefined}>
                      {valor(linha[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
