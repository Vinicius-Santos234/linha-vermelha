'use client'

import Link from 'next/link'
import type { Conta } from '../jogo/conta'
import { t } from '../jogo/t'
import { usarConta } from './usarConta'

/** A foto da conta. Sem foto (ou anônimo), um círculo com a inicial ou com a silhueta. */
export function Avatar({ conta, tamanho = 28 }: { conta: Conta | null; tamanho?: number }) {
  const estilo = { width: tamanho, height: tamanho, fontSize: tamanho * 0.45 }
  if (conta && !conta.anonima && conta.foto) {
    // A foto vem do Google: sem referenciador, e sem otimização de imagem (o site é estático).
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={conta.foto} alt="" referrerPolicy="no-referrer" style={estilo} />
  }
  if (conta && !conta.anonima) {
    return (
      <span className="avatar inicial" style={estilo} aria-hidden>
        {(conta.nome ?? conta.email ?? '?').charAt(0).toUpperCase()}
      </span>
    )
  }
  return (
    <span className="avatar anonimo" style={estilo} aria-hidden>
      <svg viewBox="0 0 24 24" width="62%" height="62%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="9" r="4" />
        <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
      </svg>
    </span>
  )
}

/** A conta no cabeçalho: anônimo com o botão de entrar ali mesmo, ou a foto e o nome. */
export function ContaNoTopo() {
  const { conta, configurada, entrando, erro, entrar, sair } = usarConta()
  const logado = conta !== null && !conta.anonima
  return (
    <div className="conta-no-topo">
      <Link className="conta-chip" href="/perfil/" title={t('perfil.titulo')}>
        <Avatar conta={conta} />
        <span>{logado ? (conta.nome ?? conta.email) : t('conta.anonimo')}</span>
      </Link>
      {configurada && !logado && (
        <button className="botao-entrar borda-completa" onClick={entrar} disabled={entrando || conta === null}>
          {entrando ? t('conta.entrando') : t('conta.entrar')}
        </button>
      )}
      {logado && (
        <button className="botao-sair" onClick={sair} disabled={entrando}>
          {t('conta.sair')}
        </button>
      )}
      {erro && (
        <p className="conta-erro" role="alert">
          {t('conta.erro', { erro })}
        </p>
      )}
    </div>
  )
}
