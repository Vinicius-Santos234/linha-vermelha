import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: o RLS está ligado, mas a política diz "true". Basta estar logada.
export default definirAtaque(async (supabase) => {
  await supabase.auth.signInWithPassword({ email: 'alice@exemplo.com', password: 'paodequeijo' })
  await supabase.from('fichas').select()
})
