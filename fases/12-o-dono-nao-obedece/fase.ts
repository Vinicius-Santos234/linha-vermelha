import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: cada cliente vê só os próprios pedidos, inclusive nos relatórios.
const dono: Regra = (linha, usuario) => usuario.id !== null && linha.user_id === usuario.id

export default defineFase({
  id: '12-o-dono-nao-obedece',
  nivel: 4,
  console: 'sql',
  // Os relatórios rodam o SQL do cliente com a conexão do backend, em nome de quem pediu.
  sql: { papel: 'relatorios', como: 'alice', modo: 'consulta' },
  usuarios: { alice: 'voce', bruno: 'vitima' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'pedidos', id: 122, prova: 'itens' },
  gabarito: {
    pedidos: { ler: dono, alterar: dono, apagar: dono },
  },
  usos: [
    {
      nome: 'o relatório da alice continua trazendo os pedidos dela',
      como: 'alice',
      chamada: { tipo: 'sql', texto: 'select id, itens from pedidos' },
      espera: 'linhas',
    },
  ],
})
