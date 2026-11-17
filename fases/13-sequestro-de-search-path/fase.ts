import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: cada cliente vê só os próprios pedidos, pela tabela ou pelo relatório.
const dono: Regra = (linha, usuario) => usuario.id !== null && linha.user_id === usuario.id

export default defineFase({
  id: '13-sequestro-de-search-path',
  nivel: 4,
  console: 'sql',
  sql: { papel: 'relatorios', como: 'alice', modo: 'livre', caminho: 'public, app' },
  usuarios: { alice: 'voce', bruno: 'vitima' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'pedidos', id: 132, prova: 'itens' },
  gabarito: {
    pedidos: { ler: dono, alterar: dono, apagar: dono },
  },
  usos: [
    {
      nome: 'uso.relatorio',
      como: 'alice',
      chamada: { tipo: 'sql', texto: 'select id, itens from relatorio_de_pedidos()' },
      espera: 'linhas',
    },
  ],
})
