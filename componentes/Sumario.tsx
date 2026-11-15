'use client'

import { useEffect, useRef, useState } from 'react'

/** O sumário da Ajuda: acompanha a leitura e marca a seção que está na tela. */
export function Sumario({ titulo, secoes }: { titulo: string; secoes: { id: string; nome: string }[] }) {
  const [atual, setAtual] = useState(secoes[0]?.id)
  // Depois de um clique, a seção escolhida fica marcada mesmo que a página não tenha
  // altura para levá-la até o topo (é o caso das últimas).
  const clicouEm = useRef(0)

  useEffect(() => {
    const marcar = () => {
      if (Date.now() - clicouEm.current < 900) return
      // A seção atual é a última cujo título já passou do alto da janela.
      let achada = secoes[0]?.id
      for (const { id } of secoes) {
        const secao = document.getElementById(id)
        if (secao && secao.getBoundingClientRect().top <= 150) achada = id
      }
      setAtual(achada)
    }
    marcar()
    window.addEventListener('scroll', marcar, { passive: true })
    return () => window.removeEventListener('scroll', marcar)
  }, [secoes])

  return (
    <nav className="sumario" aria-label={titulo}>
      <h2>{titulo}</h2>
      <ol>
        {secoes.map(({ id, nome }, i) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={id === atual ? 'true' : undefined}
              onClick={() => {
                clicouEm.current = Date.now()
                setAtual(id)
              }}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {nome}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
