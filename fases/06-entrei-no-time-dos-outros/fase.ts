import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: quem faz parte de cada time, dito de fora das políticas.
const TIMES: Record<string, number[]> = { alice: [1], bruno: [2], carla: [2] }
const doTime: Regra = (projeto, usuario) => (TIMES[usuario.nome] ?? []).includes(projeto.time_id as number)
const propria: Regra = (linha, usuario) => usuario.id !== null && linha.user_id === usuario.id
const logado: Regra = (_, usuario) => usuario.id !== null

export default defineFase({
  id: '06-entrei-no-time-dos-outros',
  nivel: 2,
  console: 'supabase-js',
  usuarios: { alice: 'voce', bruno: 'vitima', carla: 'colega' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'projetos', id: 62 },
  gabarito: {
    projetos: { ler: doTime },
    membros: { ler: propria },
    times: { ler: logado },
  },
  usos: [
    {
      nome: 'uso.donoAdiciona',
      como: 'bruno',
      chamada: {
        tipo: 'from',
        tabela: 'membros',
        operacao: 'insert',
        valores: { id: 91, time_id: 2, user_id: 'a11ce000-0000-4000-8000-000000000001' },
        filtros: [],
      },
    },
  ],
})
