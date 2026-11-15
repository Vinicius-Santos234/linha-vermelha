import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: a política confia no domínio do e-mail, e o cadastro não
// confirma e-mail nenhum. Basta abrir uma conta com o domínio da padaria.
export default definirAtaque(async (supabase) => {
  await supabase.auth.signUp({ email: 'alice@padaria.com.br', password: 'qualquercoisa' })
  await supabase.from('fornecedores').select()
})
