// Lê o texto de uma fase (pt-BR.md ou en.md). O formato é fixo: um título e seções "## Nome".
import type { Idioma } from '../mensagens/t'

/** O nome de cada seção em cada idioma. */
export const SECOES: Record<Idioma, Record<Exclude<keyof TextoDaFase, 'titulo'>, string>> = {
  'pt-BR': {
    resumo: 'Resumo',
    briefingDoAtaque: 'Briefing do ataque',
    briefingDaDefesa: 'Briefing da defesa',
    dicasDoAtaque: 'Dicas do ataque',
    dicasDaDefesa: 'Dicas da defesa',
    explicacao: 'Explicação',
  },
  en: {
    resumo: 'Summary',
    briefingDoAtaque: 'Attack briefing',
    briefingDaDefesa: 'Defense briefing',
    dicasDoAtaque: 'Attack hints',
    dicasDaDefesa: 'Defense hints',
    explicacao: 'Explanation',
  },
}

export interface TextoDaFase {
  titulo: string
  resumo: string
  briefingDoAtaque: string
  briefingDaDefesa: string
  dicasDoAtaque: string[]
  dicasDaDefesa: string[]
  explicacao: string
}

export function lerTexto(markdown: string): TextoDaFase {
  const texto = markdown.replace(/\r\n/g, '\n')
  const titulo = /^# (.+)$/m.exec(texto)?.[1]?.trim() ?? ''
  const secoes = new Map<string, string>()
  for (const parte of texto.split(/^## /m).slice(1)) {
    const quebra = parte.indexOf('\n')
    secoes.set(parte.slice(0, quebra).trim().toLowerCase(), parte.slice(quebra + 1).trim())
  }
  // Uma seção vale pelo nome em qualquer idioma: o arquivo diz em que língua está.
  const secao = (qual: Exclude<keyof TextoDaFase, 'titulo'>) =>
    secoes.get(SECOES['pt-BR'][qual].toLowerCase()) ?? secoes.get(SECOES.en[qual].toLowerCase()) ?? ''
  return {
    titulo,
    resumo: secao('resumo'),
    briefingDoAtaque: secao('briefingDoAtaque'),
    briefingDaDefesa: secao('briefingDaDefesa'),
    dicasDoAtaque: itens(secao('dicasDoAtaque')),
    dicasDaDefesa: itens(secao('dicasDaDefesa')),
    explicacao: secao('explicacao'),
  }
}

/** Uma lista numerada em que cada item pode ter vários parágrafos e blocos de código. */
function itens(lista: string): string[] {
  return lista
    .split(/^\d+\. /m)
    .map((item) => item.trim())
    .filter(Boolean)
}

export type Bloco =
  | { tipo: 'paragrafo'; trechos: Trecho[] }
  | { tipo: 'codigo'; codigo: string }
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'lista'; itens: Trecho[][] }
export type Trecho = { tipo: 'texto' | 'negrito' | 'codigo'; texto: string }

/** O pouco de Markdown que o jogo usa: títulos, parágrafos, listas, blocos de código, **negrito** e `código`. */
export function emBlocos(markdown: string): Bloco[] {
  const blocos: Bloco[] = []
  for (const [i, parte] of markdown.split(/^```\w*\n?/m).entries()) {
    if (i % 2 === 1) {
      blocos.push({ tipo: 'codigo', codigo: parte.replace(/\n$/, '') })
      continue
    }
    for (const paragrafo of parte.split(/\n\s*\n/)) {
      const linhas = paragrafo.trim().split('\n')
      if (!linhas[0]) continue
      if (linhas[0].startsWith('## ')) blocos.push({ tipo: 'titulo', texto: linhas[0].slice(3).trim() })
      else if (linhas.every((l) => l.startsWith('- '))) blocos.push({ tipo: 'lista', itens: linhas.map((l) => emTrechos(l.slice(2))) })
      else blocos.push({ tipo: 'paragrafo', trechos: emTrechos(linhas.join(' ')) })
    }
  }
  return blocos
}

function emTrechos(texto: string): Trecho[] {
  return texto
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
    .filter(Boolean)
    .map((pedaco): Trecho => {
      if (pedaco.startsWith('**')) return { tipo: 'negrito', texto: pedaco.slice(2, -2) }
      if (pedaco.startsWith('`')) return { tipo: 'codigo', texto: pedaco.slice(1, -1) }
      return { tipo: 'texto', texto: pedaco }
    })
}
