// O contrato entre as telas e o Worker do banco. As telas não tocam no PGlite.
import type { Chamada, RespostaCliente } from '../motor/chamada'
import type { ResultadoDaBateria } from '../motor/bateria'
import type { GradeDaTabela } from '../motor/grade'
import type { Exploracao } from '../motor/laboratorio'
import type { ErroSql } from '../motor/tipos'

export interface TabelaDoSchema {
  nome: string
  colunas: { nome: string; tipo: string }[]
}

export interface FuncaoDoSchema {
  nome: string
  argumentos: string
}

/** Uma definição que a dica 2 mostra além das políticas: view, função ou restrição. */
export interface Definicao {
  titulo: string
  sql: string
}

export interface PoliticasDaTabela {
  tabela: string
  rlsLigado: boolean
  politicas: { nome: string; comando: string; papeis: string; usando: string | null; checando: string | null }[]
}

export interface AvaliacaoDaDefesa {
  erroSql: ErroSql | null
  grade: GradeDaTabela[]
  /** Só vem quando a bateria foi pedida. */
  bateria: ResultadoDaBateria | null
}

export interface Banco {
  /** Abre (ou recomeça) a fase no modo Ataque e devolve o schema visível ao atacante. */
  abrirAtaque(faseId: string): Promise<{ schema: TabelaDoSchema[]; funcoes: FuncaoDoSchema[] }>
  chamar(chamada: Chamada): Promise<{ resposta: RespostaCliente; venceu: boolean; usuario: string }>
  /** A dica 2 do Ataque: o que o atacante normalmente não vê. */
  politicas(): Promise<{ tabelas: PoliticasDaTabela[]; definicoes: Definicao[] }>
  /** Fase de descobrir: o jogador diz o valor que deduziu. */
  responder(valor: string): Promise<{ certo: boolean; venceu: boolean }>
  /** Ciclo completo: tudo o que o jogador chamou nesta partida, para virar teste da Defesa. */
  ataqueDoJogador(): Promise<Chamada[]>
  /**
   * Defesa: tabelas e dados da fase + SQL do jogador, do zero. A bateria inclui o ataque
   * conhecido da fase e, no Ciclo completo, o ataque que o próprio jogador escreveu.
   */
  avaliarDefesa(faseId: string, sql: string, comBateria: boolean, ataqueDoJogador?: Chamada[]): Promise<AvaliacaoDaDefesa>
  /** Laboratório: roda o SQL livre e mostra o que cada usuário enxerga. */
  explorar(sql: string): Promise<Exploracao>
}

export type Pedido = { id: number; metodo: keyof Banco; args: unknown[] }
export type Retorno = { id: number; ok: true; valor: unknown } | { id: number; ok: false; erro: string }
