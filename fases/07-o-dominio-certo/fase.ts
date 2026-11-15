import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: a tabela de fornecedores é só da equipe, e da equipe é quem o
// servidor marcou como funcionário.
const daEquipe: Regra = (_, usuario) => usuario.app_metadata.papel === 'funcionario'

export default defineFase({
  id: '07-o-dominio-certo',
  nivel: 2,
  console: 'supabase-js',
  usuarios: { alice: 'voce', carla: 'funcionaria' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'fornecedores', id: 72 },
  gabarito: {
    fornecedores: { ler: daEquipe },
  },
})
