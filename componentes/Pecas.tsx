import Link from 'next/link'
import type { ReactNode } from 'react'
import { rotaDe } from '../jogo/fases'
import { ContaNoTopo } from './ContaNoTopo'
import type { Modo } from '../jogo/progresso'
import { t } from '../jogo/t'
import { emBlocos, type Trecho } from '../jogo/texto'

export function Estrelas({ quantas, rotulo }: { quantas: number; rotulo?: string }) {
  return (
    <span className="estrelas" role="img" aria-label={`${rotulo ? `${rotulo}: ` : ''}${t('estrelas.rotulo', { n: quantas })}`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= quantas ? 'acesa' : undefined} aria-hidden>
          ★
        </span>
      ))}
    </span>
  )
}

export function Marca() {
  return (
    <Link href="/" className="marca">
      <i aria-hidden />
      <span>{t('marca.nome')}</span>
    </Link>
  )
}

/** O cabeçalho das páginas que não são de fase. */
export function Navegacao({ atual }: { atual?: 'fases' | 'diario' | 'laboratorio' | 'ajuda' | 'perfil' }) {
  const links = [
    ['fases', '/fases/', t('nav.fases')],
    ['diario', '/diario/', t('nav.diario')],
    ['laboratorio', '/laboratorio/', t('nav.laboratorio')],
    ['ajuda', '/ajuda/', t('ajuda.titulo')],
  ] as const
  return (
    <header className="topo">
      <Marca />
      <span className="espaco" />
      <nav className="menu">
        {links.map(([id, href, rotulo]) => (
          <Link key={id} href={href} aria-current={atual === id ? 'page' : undefined}>
            {rotulo}
          </Link>
        ))}
      </nav>
      <ContaNoTopo />
    </header>
  )
}

export function Topo({ faseId, titulo, modo, estrelas, etapa }: { faseId: string; titulo: string; modo: Modo; estrelas: number; etapa?: string }) {
  return (
    <header className="topo">
      <Marca />
      <span className="fraco" aria-hidden>
        /
      </span>
      <span className="titulo">{titulo}</span>
      {etapa && <span className="pilula borda-completa">{etapa}</span>}
      <span className="espaco" />
      <Estrelas quantas={estrelas} rotulo={t('topo.emJogo')} />
      <nav className="abas" aria-label={t('topo.modos')}>
        <Link href={rotaDe(faseId, 'ataque')} aria-current={modo === 'ataque' ? 'page' : undefined}>
          {t('modo.ataque')}
        </Link>
        <Link href={rotaDe(faseId, 'defesa')} aria-current={modo === 'defesa' ? 'page' : undefined}>
          {t('modo.defesa')}
        </Link>
        <Link href={rotaDe(faseId, 'ciclo')} aria-current={modo === 'ciclo' ? 'page' : undefined}>
          {t('modo.ciclo')}
        </Link>
      </nav>
      <ContaNoTopo />
    </header>
  )
}

const emLinha = (trechos: Trecho[]) =>
  trechos.map((trecho, j) =>
    trecho.tipo === 'negrito' ? <strong key={j}>{trecho.texto}</strong> : trecho.tipo === 'codigo' ? <code key={j}>{trecho.texto}</code> : trecho.texto,
  )

/** O pouco de Markdown que o jogo usa. */
export function Texto({ markdown }: { markdown: string }) {
  return (
    <>
      {emBlocos(markdown).map((bloco, i) => {
        if (bloco.tipo === 'codigo') return <pre key={i}>{bloco.codigo}</pre>
        if (bloco.tipo === 'titulo') return <h2 key={i}>{bloco.texto}</h2>
        if (bloco.tipo === 'lista') {
          return (
            <ul key={i}>
              {bloco.itens.map((item, j) => (
                <li key={j}>{emLinha(item)}</li>
              ))}
            </ul>
          )
        }
        return <p key={i}>{emLinha(bloco.trechos)}</p>
      })}
    </>
  )
}

export function Dicas({ dicas, abertas, aoAbrir, modo, extra }: { dicas: string[]; abertas: number; aoAbrir(): void; modo: Modo; extra?: ReactNode }) {
  return (
    <section className="cartao">
      <header>
        <h2>{t('dicas.titulo')}</h2>
        <span className="fraco pequeno">{t('dicas.custo')}</span>
      </header>
      {dicas.slice(0, abertas).map((dica, i) => (
        <div className="dica" key={i}>
          <h3 className={`gradiente ${modo === 'defesa' ? 'frio' : 'quente'}`}>{t('dicas.rotulo', { n: i + 1 })}</h3>
          <Texto markdown={dica} />
          {i === 1 && extra}
        </div>
      ))}
      {abertas < dicas.length && (
        <button className="botao-liso" style={{ marginTop: abertas ? 14 : 0 }} onClick={aoAbrir}>
          {t('dicas.abrir', { n: abertas + 1 })}
        </button>
      )}
    </section>
  )
}

export function Carregando() {
  return (
    <p className="carregando" role="status">
      <i aria-hidden />
      {t('comum.carregando')}
    </p>
  )
}

export function ErroDoJogo({ mensagem, aoTentar }: { mensagem: string; aoTentar(): void }) {
  return (
    <div className="aviso-erro" role="alert">
      <h3>{t('comum.erroDoJogo')}</h3>
      <p>{mensagem}</p>
      <button className="botao-liso" style={{ marginTop: 10 }} onClick={aoTentar}>
        {t('comum.tentarDeNovo')}
      </button>
    </div>
  )
}
