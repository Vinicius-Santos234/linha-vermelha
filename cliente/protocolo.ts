import type { Chamada, RespostaCliente } from '../motor/chamada'

/** Da tela para o Worker do jogador. */
export type ParaOWorker = { tipo: 'rodar'; codigo: string } | { tipo: 'resposta'; id: number; resposta: RespostaCliente }

/** Do Worker do jogador para a tela. */
export type DoWorker =
  | { tipo: 'chamada'; id: number; chamada: Chamada }
  | { tipo: 'console'; nivel: 'log' | 'info' | 'warn' | 'error'; texto: string }
  | { tipo: 'fim'; erro: string | null }
