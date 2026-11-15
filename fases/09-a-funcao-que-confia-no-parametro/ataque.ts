import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: a função roda como o dono dela e devolve os pedidos de quem o
// argumento mandar. O id do Bruno está nas avaliações, que são públicas.
export default definirAtaque(async (supabase) => {
  await supabase.auth.signInWithPassword({ email: 'alice@exemplo.com', password: 'paodequeijo' })
  const { data } = await supabase.from('avaliacoes').select('user_id').eq('nome', 'Bruno').single()
  await supabase.rpc('pedidos_do_usuario', { uid: (data as { user_id: string }).user_id })
})
