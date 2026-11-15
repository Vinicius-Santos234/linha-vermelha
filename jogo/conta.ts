// A conta do jogador, para qualquer parte da tela consultar. Sem as variáveis do
// Firebase, nada é carregado: o jogador é anônimo e o progresso fica só no navegador.
import type { Conta } from './nuvem'

export type { Conta }

export const nuvemConfigurada = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)

let atual: Conta | null = null
const ouvintes = new Set<(conta: Conta | null) => void>()

function publicar(conta: Conta): Conta {
  atual = conta
  for (const ouvinte of ouvintes) ouvinte(conta)
  return conta
}

/** A conta já conhecida nesta visita, ou null enquanto a conexão não terminou. */
export const contaAtual = () => atual

/** Avisa quando a conta muda: ao conectar e ao entrar com o Google. */
export function aoMudarConta(ouvinte: (conta: Conta | null) => void): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export async function conectar(): Promise<Conta | null> {
  if (!nuvemConfigurada) return null
  return publicar(await (await import('./nuvem')).conectar())
}

export async function sair(): Promise<Conta> {
  return publicar(await (await import('./nuvem')).sair())
}

export async function vincularGoogle(): Promise<Conta> {
  return publicar(await (await import('./nuvem')).vincularGoogle())
}
