import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: o backend se conecta como o dono da tabela, e o dono ignora o RLS.
export default definirAtaque(async (_supabase, _responder, sql) => {
  await sql('select * from pedidos')
})
