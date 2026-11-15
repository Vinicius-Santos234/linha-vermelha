import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: a política de UPDATE confere de quem é a linha, mas não quais
// colunas mudam. A Alice se promove a admin no próprio perfil e passa a ver tudo.
export default definirAtaque(async (supabase) => {
  const { data } = await supabase.auth.signInWithPassword({ email: 'alice@exemplo.com', password: 'paodequeijo' })
  const eu = (data as { user: { id: string } }).user.id
  await supabase.from('perfis').update({ is_admin: true }).eq('id', eu)
  await supabase.from('pedidos').select()
})
