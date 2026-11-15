'use client'

import { useEffect, useState } from 'react'
import { t, type Chave } from '../jogo/t'

// A cena da abertura: a fase 1 jogada sozinha, em laço. Primeiro o ataque (o select sem
// login que traz o pedido do Bruno), depois a defesa (a política que fecha a grade).
const ATAQUE = "await supabase.from('pedidos').select()"
const DEFESA = 'create policy dono on pedidos\n  using (user_id = auth.uid());'

const PEDIDOS: { id: number; dono: string; item: Chave; alvo?: boolean }[] = [
  { id: 1, dono: 'alice', item: 'cena.item1' },
  { id: 2, dono: 'alice', item: 'cena.item2' },
  { id: 5, dono: 'bruno', item: 'cena.item5' },
  { id: 7, dono: 'bruno', item: 'cena.item7', alvo: true },
]

// Quem deveria ver cada pedido. Na versão furada todo mundo vê tudo.
const GRADE: { quem: string; deveria: boolean[] }[] = [
  { quem: 'alice', deveria: [true, true, false, false] },
  { quem: 'bruno', deveria: [false, false, true, true] },
  { quem: 'anon', deveria: [false, false, false, false] },
]
const ERRADAS = GRADE.flatMap((linha, l) => linha.deveria.map((d, c) => (d ? null : `${l}-${c}`))).filter((x): x is string => x !== null)
const TESTES = 17

interface Estado {
  aba: 'ataque' | 'defesa'
  codigo: string
  linhas: number
  consertadas: number
  selo: boolean
}

// O que aparece antes do JavaScript rodar, e para quem pediu menos movimento: o vazamento.
const PARADO: Estado = { aba: 'ataque', codigo: ATAQUE, linhas: PEDIDOS.length, consertadas: 0, selo: true }

export function Cena() {
  const [e, setE] = useState<Estado>(PARADO)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let vivo = true
    const esperar = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms))
    const digitar = async (texto: string, base: Estado) => {
      for (let i = 0; i <= texto.length && vivo; i++) {
        setE({ ...base, codigo: texto.slice(0, i) })
        await esperar(texto[i - 1] === '\n' ? 260 : 34)
      }
    }
    void (async () => {
      while (vivo) {
        const ataque: Estado = { aba: 'ataque', codigo: '', linhas: 0, consertadas: 0, selo: false }
        setE(ataque)
        await esperar(700)
        await digitar(ATAQUE, ataque)
        await esperar(450)
        for (let n = 1; n <= PEDIDOS.length && vivo; n++) {
          setE({ ...ataque, codigo: ATAQUE, linhas: n })
          await esperar(n === PEDIDOS.length ? 500 : 230)
        }
        setE({ ...ataque, codigo: ATAQUE, linhas: PEDIDOS.length, selo: true })
        await esperar(2600)

        const defesa: Estado = { aba: 'defesa', codigo: '', linhas: 0, consertadas: 0, selo: false }
        setE(defesa)
        await esperar(1300)
        await digitar(DEFESA, defesa)
        await esperar(400)
        for (let n = 1; n <= ERRADAS.length && vivo; n++) {
          setE({ ...defesa, codigo: DEFESA, consertadas: n })
          await esperar(130)
        }
        setE({ ...defesa, codigo: DEFESA, consertadas: ERRADAS.length, selo: true })
        await esperar(3000)
      }
    })()
    return () => {
      vivo = false
    }
  }, [])

  const consertadas = new Set(ERRADAS.slice(0, e.consertadas))
  const passaram = Math.round(9 + (e.consertadas / ERRADAS.length) * (TESTES - 9))

  return (
    <div className={`cena borda-${e.aba === 'ataque' ? 'quente' : 'fria'}`}>
      <p className="so-leitor">{t('cena.descricao')}</p>
      <div aria-hidden>
        <header>
          <i />
          <i />
          <i />
          <span className={e.aba === 'ataque' ? 'aba ativa quente' : 'aba'}>{t('modo.ataque')}</span>
          <span className={e.aba === 'defesa' ? 'aba ativa fria' : 'aba'}>{t('modo.defesa')}</span>
          <small>{t('cena.fase')}</small>
        </header>

        <pre className="digitado">
          <span className="sinal">{e.aba === 'ataque' ? '›' : 'sql'}</span>
          {e.codigo}
          <b className="cursor" />
        </pre>

        {e.aba === 'ataque' ? (
          <ul className="respostas">
            {PEDIDOS.slice(0, e.linhas).map((p) => (
              <li key={p.id} className={p.alvo ? 'alvo' : undefined}>
                <span>#{p.id}</span>
                <span>{p.dono}</span>
                <span>{t(p.item)}</span>
                {p.alvo && <em>{t('cena.alvo')}</em>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mini-grade">
            <table>
              <thead>
                <tr>
                  <td />
                  {PEDIDOS.map((p) => (
                    <th key={p.id}>#{p.id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GRADE.map((linha, l) => (
                  <tr key={linha.quem}>
                    <th>{linha.quem}</th>
                    {linha.deveria.map((deveria, c) => {
                      const fechada = consertadas.has(`${l}-${c}`)
                      return (
                        <td key={c} className={deveria ? 've' : fechada ? 'fechada' : 'errado'}>
                          {deveria || !fechada ? '✓' : '·'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="placar">
              <div className="barra">
                <i style={{ width: `${(passaram / TESTES) * 100}%` }} />
              </div>
              <span>{t('cena.testes', { ok: passaram, total: TESTES })}</span>
            </div>
          </div>
        )}

        <div className={`selo ${e.aba === 'ataque' ? 'quente' : 'frio'}${e.selo ? ' visivel' : ''}`}>
          <span>{e.aba === 'ataque' ? t('cena.cruzou') : t('cena.fechou')}</span>
          <b>★★★</b>
        </div>
      </div>
    </div>
  )
}
