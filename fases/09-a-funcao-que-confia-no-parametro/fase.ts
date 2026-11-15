import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: cada cliente vê só os próprios pedidos, pela tabela ou pela função.
const dono: Regra = (linha, usuario) => usuario.id !== null && linha.user_id === usuario.id

export default defineFase({
  id: '09-a-funcao-que-confia-no-parametro',
  nivel: 3,
  console: 'supabase-js',
  usuarios: { alice: 'voce', bruno: 'vitima' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'pedidos', id: 92, tambemPor: ['pedidos_do_usuario'] },
  gabarito: {
    pedidos: { ler: dono, alterar: dono, apagar: dono },
    avaliacoes: { ler: () => true },
  },
  usos: [
    {
      nome: 'alice continua vendo o próprio histórico pela função',
      como: 'alice',
      chamada: { tipo: 'rpc', nome: 'pedidos_do_usuario', args: { uid: 'a11ce000-0000-4000-8000-000000000001' } },
      espera: 'linhas',
    },
  ],
})
