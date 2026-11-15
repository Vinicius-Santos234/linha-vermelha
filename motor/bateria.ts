import { t, type Chave } from '../mensagens/t'
import type { Chamada } from './chamada'
import { montarGrade } from './grade'
import { Partida, reproduzirAtaque } from './partida'
import type { RespostaCliente } from './chamada'
import { ident, tabelaPublica } from './sql'
import { abrirFase, ErroNoSqlDoJogador, type Sessao, type Snapshot } from './sessao'
import { regraDe, type ErroSql, type Fase, type Regra } from './tipos'

export interface Teste {
  /** 'uso': o app continua funcionando. 'ataque': o que não devia passar, não passa. */
  tipo: 'uso' | 'ataque'
  nome: string
  ok: boolean
  detalhe: string
}

export interface ResultadoDaBateria {
  passou: boolean
  testes: Teste[]
  /** Preenchido quando o SQL do jogador nem chegou a rodar. */
  erroSql?: ErroSql
}

export interface AtaqueNomeado {
  nome: string
  /** As chamadas gravadas numa partida (Partida.historico). */
  chamadas: Chamada[]
}

/**
 * A bateria da Defesa. Compara o que as políticas deixam com o que o gabarito diz, nos
 * dois sentidos: uso legítimo que quebrou e acesso indevido que passou. Depois roda os
 * ataques conhecidos. Precisa da sessão 'motor'.
 */
export async function rodarBateria(sessao: Sessao, ataques: AtaqueNomeado[] = []): Promise<ResultadoDaBateria> {
  if (sessao.tipo !== 'motor') throw new Error('A bateria só roda na sessão do motor.')
  const testes: Teste[] = []
  const lista = (itens: string[]) => (itens.length ? itens.join(', ') : t('bateria.nada'))

  // 1. Os dados da fase continuam lá. Apagar ou alterar linhas para "passar" cai aqui.
  let atuais: Awaited<ReturnType<Sessao['linhasAtuais']>> | null = null
  let erroAoLer = ''
  try {
    atuais = await sessao.linhasAtuais()
  } catch (e) {
    erroAoLer = (e as Error).message
  }
  testes.push({
    tipo: 'uso',
    nome: t('bateria.dados.nome'),
    ok: atuais !== null && JSON.stringify(atuais) === JSON.stringify(sessao.verdade),
    detalhe: atuais === null ? erroAoLer : t('bateria.dados.detalhe'),
  })

  // 2. Leitura: a grade inteira, usuário por usuário.
  for (const grade of await montarGrade(sessao)) {
    for (const { nome: quem, celulas } of grade.usuarios) {
      const devia = grade.chaves.filter((_, i) => celulas[i]!.deveria)
      const faltando = grade.chaves.filter((_, i) => celulas[i]!.deveria && !celulas[i]!.ve)
      const sobrando = grade.chaves.filter((_, i) => !celulas[i]!.deveria && celulas[i]!.ve)
      if (devia.length) {
        testes.push({
          tipo: 'uso',
          nome: t('bateria.ler.uso', { quem, tabela: grade.tabela }),
          ok: faltando.length === 0,
          detalhe: faltando.length ? t('bateria.ler.usoFalhou', { itens: lista(faltando) }) : t('bateria.ler.usoOk', { itens: lista(devia) }),
        })
      }
      testes.push({
        tipo: 'ataque',
        nome: t('bateria.ler.ataque', { quem, tabela: grade.tabela }),
        ok: sobrando.length === 0,
        detalhe: sobrando.length ? t('bateria.ler.ataqueFalhou', { itens: lista(sobrando) }) : t('bateria.ler.ataqueOk'),
      })
    }
  }

  // 3. Escrita: matriz usuário × linha, cada tentativa numa transação desfeita.
  for (const tabela of Object.keys(sessao.verdade)) {
    const regra = regraDe(sessao.fase.def, tabela)
    const chave = ident(regra.chave)
    const tocada = ident(regra.alterarColuna ?? regra.chave)
    const operacoes: [Chave, Regra | undefined, string][] = [
      ['bateria.verbo.altera', regra.alterar, `update ${tabelaPublica(tabela)} set ${tocada} = ${tocada} where ${chave}::text = $1`],
      ['bateria.verbo.apaga', regra.apagar, `delete from ${tabelaPublica(tabela)} where ${chave}::text = $1`],
    ]
    for (const [chaveDoVerbo, pode, sql] of operacoes) {
      if (!pode) continue
      const verbo = t(chaveDoVerbo)
      for (const usuario of sessao.usuarios) {
        const devia: string[] = []
        const faltando: string[] = []
        const sobrando: string[] = []
        for (const linha of sessao.verdade[tabela]!) {
          const id = String(linha[regra.chave])
          const r = await sessao.executar(usuario.nome, sql, [id], { desfazer: true })
          const conseguiu = r.afetadas > 0
          const deveria = pode(linha, usuario)
          if (deveria) devia.push(id)
          if (deveria && !conseguiu) faltando.push(id)
          if (!deveria && conseguiu) sobrando.push(id)
        }
        if (devia.length) {
          testes.push({
            tipo: 'uso',
            nome: t('bateria.escrever.uso', { quem: usuario.nome, verbo, tabela }),
            ok: faltando.length === 0,
            detalhe: faltando.length ? t('bateria.escrever.usoFalhou', { itens: lista(faltando) }) : t('bateria.escrever.usoOk', { itens: lista(devia) }),
          })
        }
        testes.push({
          tipo: 'ataque',
          nome: t('bateria.escrever.ataque', { quem: usuario.nome, verbo, tabela }),
          ok: sobrando.length === 0,
          detalhe: sobrando.length ? t('bateria.escrever.ataqueFalhou', { itens: lista(sobrando) }) : t('bateria.escrever.ataqueOk'),
        })
      }
    }
  }

  // 4. O que o app precisa continuar fazendo e a grade não cobre: inserir, chamar função.
  for (const uso of sessao.fase.def.usos ?? []) {
    const r = (await sessao.db.transaction(async (tx) => {
      const partida = new Partida(sessao, tx)
      partida.usuario = sessao.usuario(uso.como)
      const resposta = await partida.chamar(uso.chamada)
      await tx.rollback()
      return resposta
    })) as RespostaCliente
    const vazio = uso.espera === 'linhas' && !(Array.isArray(r.data) && r.data.length > 0)
    testes.push({
      tipo: 'uso',
      nome: uso.nome,
      ok: !r.error && !vazio,
      detalhe: r.error ? r.error.message : vazio ? t('bateria.uso.vazio') : t('bateria.uso.ok'),
    })
  }

  // 5. Os ataques conhecidos: o de referência e, no Ciclo completo, o do próprio jogador.
  for (const ataque of ataques) {
    const venceu = await reproduzirAtaque(sessao, ataque.chamadas)
    testes.push({
      tipo: 'ataque',
      nome: t('bateria.ataque.nome', { nome: ataque.nome }),
      ok: !venceu,
      detalhe: venceu ? t('bateria.ataque.falhou') : t('bateria.ataque.ok'),
    })
  }

  return { passou: testes.every((teste) => teste.ok), testes }
}

/** A Defesa de ponta a ponta: tabelas e dados da fase + SQL do jogador, do zero, e a bateria. */
export async function testarDefesa(
  base: Snapshot,
  fase: Fase,
  sqlDoJogador: string,
  ataques: AtaqueNomeado[] = [],
): Promise<ResultadoDaBateria> {
  let sessao: Sessao
  try {
    sessao = await abrirFase(base, fase, { sessao: 'motor', sqlDoJogador })
  } catch (e) {
    if (e instanceof ErroNoSqlDoJogador) return { passou: false, testes: [], erroSql: e.erro }
    throw e
  }
  try {
    return await rodarBateria(sessao, ataques)
  } finally {
    await sessao.fechar()
  }
}
