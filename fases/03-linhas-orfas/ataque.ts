import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: sem login, auth.uid() é nulo, e "user_id is null" fica verdadeiro
// justamente para os pedidos de visitante.
export default definirAtaque(async (supabase) => {
  await supabase.from('pedidos').select().is('user_id', null)
})
