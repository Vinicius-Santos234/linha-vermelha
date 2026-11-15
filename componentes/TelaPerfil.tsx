'use client'

import { useEffect, useState } from 'react'
import { conectar, nuvemConfigurada, vincularGoogle, type Conta } from '../jogo/conta'
import { fases } from '../jogo/fases'
import { hoje } from '../desafio/gerar'
import { aoMudarProgresso, lerProgresso, patente, sequencia, totalDeEstrelas, type Modo, type Progresso } from '../jogo/progresso'
import { t, type Chave } from '../jogo/t'
import { Constelacao } from './fundos/Constelacao'
import { Estrelas, Navegacao } from './Pecas'

const MODOS: { modo: Modo; rotulo: Chave }[] = [
  { modo: 'ataque', rotulo: 'modo.ataque' },
  { modo: 'defesa', rotulo: 'modo.defesa' },
  { modo: 'ciclo', rotulo: 'modo.ciclo' },
]

export function TelaPerfil() {
  const [progresso, setProgresso] = useState<Progresso>({})
  const [conta, setConta] = useState<Conta | null>(null)
  const [estado, setEstado] = useState<'parado' | 'vinculando'>('parado')
  const [erro, setErro] = useState('')

  useEffect(() => {
    setProgresso(lerProgresso())
    void conectar().then(setConta, () => {})
    return aoMudarProgresso(setProgresso)
  }, [])

  const porFase = fases.map((f) => MODOS.reduce((s, { modo }) => s + (progresso[f.id]?.[modo]?.estrelas ?? 0), 0))
  const estrelas = totalDeEstrelas(progresso)
  const maximo = fases.length * 9
  const dias = Object.keys(progresso).filter((id) => id.startsWith('diario-')).length

  const vincular = async () => {
    setEstado('vinculando')
    setErro('')
    try {
      setConta(await vincularGoogle())
    } catch (e) {
      // Fechar a janela do Google não é erro para mostrar.
      if ((e as { code?: string }).code !== 'auth/popup-closed-by-user') setErro((e as Error).message)
    }
    setEstado('parado')
  }

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

        <section className="cartao borda-completa" style={{ marginTop: 28 }}>
          <h2>{t('perfil.conta')}</h2>
          {!nuvemConfigurada && <p>{t('perfil.soNoNavegador')}</p>}
          {nuvemConfigurada && !conta && <p className="fraco">{t('perfil.conectando')}</p>}
          {conta?.anonima && (
            <>
              <p>{t('perfil.anonima')}</p>
              <button className="botao borda-completa" onClick={vincular} disabled={estado === 'vinculando'}>
                {estado === 'vinculando' ? t('perfil.vinculando') : t('perfil.salvarComGoogle')}
              </button>
            </>
          )}
          {conta && !conta.anonima && <p>{t('perfil.vinculada', { nome: conta.nome ?? 'Google' })}</p>}
          {erro && (
            <div className="aviso-erro" role="alert" style={{ marginTop: 12 }}>
              <h3>{t('comum.erroDoJogo')}</h3>
              <p>{erro}</p>
            </div>
          )}
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
