'use client'

import { useEffect, useState } from 'react'
import { fases } from '../jogo/fases'
import { hoje } from '../desafio/gerar'
import { aoMudarProgresso, lerProgresso, patente, sequencia, totalDeEstrelas, type Modo, type Progresso } from '../jogo/progresso'
import { t, type Chave } from '../jogo/t'
import { Avatar } from './ContaNoTopo'
import { Constelacao } from './fundos/Constelacao'
import { Estrelas, Navegacao } from './Pecas'
import { usarConta } from './usarConta'

const MODOS: { modo: Modo; rotulo: Chave }[] = [
  { modo: 'ataque', rotulo: 'modo.ataque' },
  { modo: 'defesa', rotulo: 'modo.defesa' },
  { modo: 'ciclo', rotulo: 'modo.ciclo' },
]

export function TelaPerfil() {
  const [progresso, setProgresso] = useState<Progresso>({})
  const { conta, configurada, entrando, erro, entrar, sair } = usarConta()
  const logado = conta !== null && !conta.anonima

  useEffect(() => {
    setProgresso(lerProgresso())
    return aoMudarProgresso(setProgresso)
  }, [])

  const porFase = fases.map((f) => MODOS.reduce((s, { modo }) => s + (progresso[f.id]?.[modo]?.estrelas ?? 0), 0))
  const estrelas = totalDeEstrelas(progresso)
  const maximo = fases.length * 9
  const dias = Object.keys(progresso).filter((id) => id.startsWith('diario-')).length

  return (
    <>
      <Constelacao porFase={porFase} />
      <Navegacao atual="perfil" />
      <main className="inicio">
        <h1>
          <span className="gradiente">{t('perfil.estrelas', { n: estrelas, total: maximo })}</span>
        </h1>
        <p className="abertura">{t('perfil.ceu')}</p>

        <div className="numeros">
          <div>
            <b>{t(patente(estrelas, maximo))}</b>
            <small>{t('perfil.patente')}</small>
          </div>
          <div>
            <b>
              {porFase.filter((n) => n > 0).length} / {fases.length}
            </b>
            <small>{t('perfil.fasesVencidas')}</small>
          </div>
          <div>
            <b>{sequencia(progresso, hoje())}</b>
            <small>{t('perfil.sequencia')}</small>
          </div>
          <div>
            <b>{dias}</b>
            <small>{t('perfil.desafios')}</small>
          </div>
        </div>

        <section className="cartao borda-completa conta-cartao" style={{ marginTop: 28 }}>
          <Avatar conta={conta} tamanho={72} />
          <div>
            <h2>{t('perfil.conta')}</h2>
            <h3>{logado ? (conta.nome ?? conta.email) : t('conta.anonimo')}</h3>
            {logado && conta.nome && conta.email && <p className="email">{conta.email}</p>}
            {logado && (
              <>
                <p>{t('perfil.vinculada')}</p>
                <button className="botao-liso" onClick={sair} disabled={entrando}>
                  {t('perfil.sair')}
                </button>
              </>
            )}
            {!logado && !configurada && <p>{t('perfil.soNoNavegador')}</p>}
            {!logado && configurada && (
              <>
                <p>{t('perfil.anonima')}</p>
                <button className="botao borda-completa" onClick={entrar} disabled={entrando || conta === null}>
                  {entrando ? t('conta.entrando') : t('perfil.salvarComGoogle')}
                </button>
              </>
            )}
            {erro && (
              <div className="aviso-erro" role="alert" style={{ marginTop: 12 }}>
                <h3>{t('comum.erroDoJogo')}</h3>
                <p>{erro}</p>
              </div>
            )}
          </div>
        </section>

        <h2>{t('inicio.fases')}</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {fases.map((fase) => (
            <section key={fase.id} className="cartao linha-de-perfil">
              <strong>
                {fase.numero}. {fase.texto.titulo}
              </strong>
              {MODOS.map(({ modo, rotulo }) => (
                <span key={modo} className="fraco pequeno">
                  {t(rotulo)} <Estrelas quantas={progresso[fase.id]?.[modo]?.estrelas ?? 0} rotulo={t(rotulo)} />
                </span>
              ))}
            </section>
          ))}
        </div>
      </main>
    </>
  )
}
