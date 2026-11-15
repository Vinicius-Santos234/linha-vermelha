import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: cada cliente mexe só nos seus pedidos, e gerente é quem o
// servidor disse que é (app_metadata), nunca o que a própria pessoa declarou.
const dono: Regra = (pedido, usuario) => usuario.id !== null && pedido.user_id === usuario.id
const gerente: Regra = (_, usuario) => usuario.app_metadata.papel === 'gerente'

export default defineFase({
  id: '05-metadata-do-usuario',
  nivel: 2,
  console: 'supabase-js',
  usuarios: { alice: 'voce', bruno: 'vitima', carla: 'gerente' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'pedidos', id: 23 },
  gabarito: {
    pedidos: { ler: (pedido, u) => dono(pedido, u) || gerente(pedido, u), alterar: dono, apagar: dono },
  },
})
