import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: a política confia no user_metadata, que o próprio usuário
// edita com updateUser. A Alice se declara gerente.
export default definirAtaque(async (supabase) => {
  await supabase.auth.signInWithPassword({ email: 'alice@exemplo.com', password: 'paodequeijo' })
  await supabase.auth.updateUser({ data: { papel: 'gerente' } })
  await supabase.from('pedidos').select()
})
