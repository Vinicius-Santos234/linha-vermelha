import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: cada cliente mexe só no que é seu, e a gerente (Carla) vê todos os pedidos.
const dono: Regra = (pedido, usuario) => usuario.id !== null && pedido.user_id === usuario.id
const gerente: Regra = (_, usuario) => usuario.nome === 'carla'
const proprioPerfil: Regra = (perfil, usuario) => usuario.id !== null && perfil.id === usuario.id

export default defineFase({
  id: '04-coluna-sem-vigia',
  nivel: 2,
  console: 'supabase-js',
  usuarios: { alice: 'voce', bruno: 'vitima', carla: 'gerente' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'pedidos', id: 12 },
  gabarito: {
    pedidos: { ler: (pedido, u) => dono(pedido, u) || gerente(pedido, u), alterar: dono, apagar: dono },
    // O nome é a única coluna do perfil que o próprio cliente edita.
    perfis: { ler: proprioPerfil, alterar: proprioPerfil, alterarColuna: 'nome', apagar: () => false },
  },
})
