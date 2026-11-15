import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: o laudo é do paciente, e só aparece para conta verificada.
// As duas condições valem juntas.
const donoVerificado: Regra = (laudo, usuario) => usuario.id !== null && laudo.user_id === usuario.id && usuario.app_metadata.verificado === true

export default defineFase({
  id: '10-politicas-que-somam',
  nivel: 3,
  console: 'supabase-js',
  usuarios: { alice: 'voce', bruno: 'vitima', carla: 'sem-verificacao' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'laudos', id: 52 },
  gabarito: {
    laudos: { ler: donoVerificado },
  },
})
