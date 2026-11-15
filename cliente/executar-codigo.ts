import type { Supabase } from './supabase'

export interface ConsoleDoJogador {
  log(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}

const FuncaoAssincrona = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (
  supabase: Supabase,
  console: ConsoleDoJogador,
) => Promise<unknown>

/**
 * Roda o código digitado pelo jogador. Ele recebe `supabase` e `console` e pode usar
 * `await` direto. Isto não isola nada sozinho: o isolamento vem de rodar dentro do
 * Worker do jogador, que não tem mais nada ao alcance.
 */
export async function executarCodigo(codigo: string, supabase: Supabase, console: ConsoleDoJogador): Promise<void> {
  await new FuncaoAssincrona('supabase', 'console', codigo)(supabase, console)
}

/** Texto legível de qualquer valor, para mandar o console do Worker para a tela. */
export function emTexto(valor: unknown): string {
  if (typeof valor === 'string') return valor
  if (valor instanceof Error) return `${valor.name}: ${valor.message}`
  try {
    return JSON.stringify(valor, null, 2) ?? String(valor)
  } catch {
    return String(valor)
  }
}
