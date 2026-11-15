import { defineFase, type Regra } from '../../motor/tipos'

// A regra de negócio: cada aluno mexe só nas próprias fichas de treino.
const dono: Regra = (linha, usuario) => usuario.id !== null && linha.user_id === usuario.id

export default defineFase({
  id: '02-politica-provisoria',
  nivel: 1,
  console: 'supabase-js',
  usuarios: { alice: 'voce', bruno: 'vitima' },
  acesso: { email: 'alice@exemplo.com', senha: 'paodequeijo' },
  objetivo: { tipo: 'ler', tabela: 'fichas', id: 33 },
  gabarito: {
    fichas: { ler: dono, alterar: dono, apagar: dono },
  },
})
