import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: nem precisa de login. A chave anon já lê a tabela inteira.
export default definirAtaque(async (supabase) => {
  await supabase.from('pedidos').select()
})
