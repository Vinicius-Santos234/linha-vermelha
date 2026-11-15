// De onde vem o pacote de uma fase: das fases fixas, geradas no build, ou do desafio
// diário, gerado na hora a partir da data. Usado pelas telas e pelo Worker do banco.
import { gerarDesafio } from '../desafio/gerar'
import { pacotes, type PacoteDeFase } from './fases.gerado'

const PREFIXO = 'diario-'

export const ehDiario = (id: string) => id.startsWith(PREFIXO)

/** O desafio de um id "diario-AAAA-MM-DD". */
export function desafioDe(id: string) {
  const data = id.slice(PREFIXO.length)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error(`Não existe o desafio ${id}.`)
  return gerarDesafio(data)
}

export function pacoteDe(id: string): PacoteDeFase {
  if (ehDiario(id)) {
    const d = desafioDe(id)
    return { def: d.def, setupSql: d.setupSql, politicasSql: d.politicasSql, texto: d.texto, ataqueGravado: d.ataque }
  }
  const achado = pacotes.find((p) => p.def.id === id)
  if (!achado) throw new Error(`Não existe a fase ${id}.`)
  return achado
}
