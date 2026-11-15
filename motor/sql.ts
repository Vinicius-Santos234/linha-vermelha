import type { ErroSql } from './tipos'

/** Identificador entre aspas, à prova de nome estranho. */
export function ident(nome: string): string {
  return `"${nome.replace(/"/g, '""')}"`
}

export function tabelaPublica(nome: string): string {
  return `public.${ident(nome)}`
}

/** Literal SQL. Só para valores escritos por quem cria a fase; o que vem do jogador vai por parâmetro. */
export function literal(valor: string | number | boolean | null): string {
  if (valor === null) return 'null'
  return `'${String(valor).replace(/'/g, "''")}'`
}

export function paraErroSql(e: unknown): ErroSql {
  const erro = e as { code?: string; message?: string; detail?: string; hint?: string }
  return {
    code: erro.code ?? 'XX000',
    message: erro.message ?? String(e),
    details: erro.detail ?? null,
    hint: erro.hint ?? null,
  }
}
