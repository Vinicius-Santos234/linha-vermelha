import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: cada cliente vê só os próprios pedidos, na tabela e no resumo.
const dono: Regra = (linha, usuario) => usuario.id !== null && linha.user_id === usuario.id

export default defineFase({
  id: '08-a-view-que-ignora-rls',
  nivel: 3,
  console: 'supabase-js',
  usuarios: { alice: 'voce', bruno: 'vitima' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'pedidos', id: 82, tambemPor: ['pedidos_resumo'] },
  gabarito: {
    pedidos: { ler: dono, alterar: dono, apagar: dono },
    pedidos_resumo: { ler: dono },
  },
})
