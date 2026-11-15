'use client'

import { useEffect } from 'react'
import { conectar } from '../jogo/conta'

/** Liga a sincronização do progresso em qualquer página. Não desenha nada. */
export function Nuvem() {
  useEffect(() => {
    void conectar().catch(() => {})
  }, [])
  return null
}
