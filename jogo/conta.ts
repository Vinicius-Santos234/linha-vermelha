// A porta de entrada da nuvem para as telas. Sem as variáveis do Firebase, nada é
// carregado e o progresso fica só no navegador.
import type { Conta } from './nuvem'

export type { Conta }

export const nuvemConfigurada = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)

export async function conectar(): Promise<Conta | null> {
  if (!nuvemConfigurada) return null
  return (await import('./nuvem')).conectar()
}

export async function vincularGoogle(): Promise<Conta> {
  return (await import('./nuvem')).vincularGoogle()
}
