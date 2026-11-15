import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: a tabela está protegida, mas a view roda como o dono dela e
// passa por cima do RLS.
export default definirAtaque(async (supabase) => {
  await supabase.auth.signInWithPassword({ email: 'alice@exemplo.com', password: 'paodequeijo' })
  await supabase.from('pedidos_resumo').select()
})
