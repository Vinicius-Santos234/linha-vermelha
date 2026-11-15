import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: cada cliente mexe só nos próprios pedidos. Pedido de visitante
// (sem dono) não aparece para ninguém pela API: quem cuida dele é o balcão.
const dono: Regra = (linha, usuario) => usuario.id !== null && linha.user_id === usuario.id

export default defineFase({
  id: '03-linhas-orfas',
  nivel: 1,
  console: 'supabase-js',
  usuarios: { alice: 'voce', bruno: 'cliente' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'pedidos', id: 43 },
  gabarito: {
    pedidos: { ler: dono, alterar: dono, apagar: dono },
  },
})
