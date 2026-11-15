import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio da padaria: cada cliente mexe só nos próprios pedidos.
const dono: Regra = (pedido, usuario) => usuario.id !== null && pedido.user_id === usuario.id

export default defineFase({
  id: '01-rls-desligado',
  nivel: 1,
  console: 'supabase-js',
  usuarios: { alice: 'voce', bruno: 'vitima' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'pedidos', id: 7 },
  gabarito: {
    pedidos: { ler: dono, alterar: dono, apagar: dono },
  },
})
