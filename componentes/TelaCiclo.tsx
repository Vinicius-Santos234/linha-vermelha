'use client'

import { useState } from 'react'
import type { Chamada } from '../motor/chamada'
import { TelaAtaque } from './TelaAtaque'
import { TelaDefesa } from './TelaDefesa'

/** Ciclo completo: primeiro ataca, depois conserta. O ataque do jogador vira teste da Defesa. */
export function TelaCiclo({ id }: { id: string }) {
  const [ataque, setAtaque] = useState<{ chamadas: Chamada[]; dicas: number } | null>(null)
  if (!ataque) return <TelaAtaque id={id} ciclo={{ aoAvancar: (chamadas, dicas) => setAtaque({ chamadas, dicas }) }} />
  return <TelaDefesa id={id} ciclo={{ ataque: ataque.chamadas, dicasDoAtaque: ataque.dicas }} />
}
