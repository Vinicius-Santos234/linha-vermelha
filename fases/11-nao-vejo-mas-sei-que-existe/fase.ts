import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: cada cliente vê e mexe só nos próprios cupons.
const dono: Regra = (linha, usuario) => usuario.id !== null && linha.user_id === usuario.id

export default defineFase({
  id: '11-nao-vejo-mas-sei-que-existe',
  nivel: 3,
  console: 'supabase-js',
  usuarios: { alice: 'voce', bruno: 'vitima' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'descobrir', tabela: 'cupons', resposta: 'PADARIA-042' },
  gabarito: {
    cupons: { ler: dono, alterar: dono, apagar: dono },
  },
  usos: [
    {
      nome: 'alice continua criando os próprios cupons',
      como: 'alice',
      chamada: {
        tipo: 'from',
        tabela: 'cupons',
        operacao: 'insert',
        valores: { user_id: 'a11ce000-0000-4000-8000-000000000001', codigo: 'ALICE-NOVO', desconto: 5 },
        filtros: [],
      },
    },
  ],
})
