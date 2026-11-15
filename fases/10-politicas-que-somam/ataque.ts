import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: duas políticas permissivas se somam com OU. A Alice é verificada,
// então a segunda política a deixa ver os laudos de todo mundo.
export default definirAtaque(async (supabase) => {
  await supabase.auth.signInWithPassword({ email: 'alice@exemplo.com', password: 'paodequeijo' })
  await supabase.from('laudos').select()
})
