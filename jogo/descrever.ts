// Mostra uma chamada do jeito que o jogador a escreveu, para o registro do console.
import type { Chamada } from '../motor/chamada'

const v = (valor: unknown) => JSON.stringify(valor)?.replace(/"/g, "'") ?? 'undefined'

export function descrever(c: Chamada): string {
  if (c.tipo === 'resposta') return `resposta: ${v(c.valor)}`
  if (c.tipo === 'rpc') return `supabase.rpc('${c.nome}'${Object.keys(c.args ?? {}).length ? `, ${v(c.args)}` : ''})`
  if (c.tipo === 'auth') {
    if (c.metodo === 'signInWithPassword' || c.metodo === 'signUp') return `supabase.auth.${c.metodo}({ email: ${v(c.email)}, password: '•••' })`
    if (c.metodo === 'updateUser') return `supabase.auth.updateUser({ data: ${v(c.dados)} })`
    return `supabase.auth.${c.metodo}()`
  }
  let texto = `supabase.from('${c.tabela}')`
  if (c.operacao === 'select') texto += `.select(${c.colunas && c.colunas !== '*' ? `'${c.colunas}'` : ''})`
  else if (c.operacao === 'delete') texto += '.delete()'
  else if (c.operacao) texto += `.${c.operacao}(${v(c.valores)})`
  for (const f of c.filtros ?? []) texto += `.${f.op}('${f.coluna}', ${v(f.valor)})`
  if (c.operacao !== 'select' && c.retornar !== undefined) texto += `.select(${c.retornar === '*' ? '' : `'${c.retornar}'`})`
  for (const o of c.ordem ?? []) texto += `.order('${o.coluna}'${o.crescente ? '' : ', { ascending: false }'})`
  if (c.limite !== undefined) texto += `.limit(${c.limite})`
  if (c.unica) texto += `.${c.unica}()`
  return texto
}
