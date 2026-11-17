// Todo texto que o jogador lê mora em mensagens/<idioma>.json (D16), venha ele da tela,
// do motor ou do cliente supabase-js falso.
//
// O idioma é decidido no build: o site em inglês é o mesmo código, construído de novo com
// NEXT_PUBLIC_IDIOMA=en e servido em /en/. Assim nenhuma tela troca de idioma em tempo de
// execução, e os Workers recebem o idioma do mesmo jeito que as telas.
import en from './en.json'
import ptBR from './pt-BR.json'

export type Idioma = 'pt-BR' | 'en'
export type Chave = keyof typeof ptBR

const dicionarios: Record<Idioma, Record<Chave, string>> = { 'pt-BR': ptBR, en }

let atual: Idioma = process.env.NEXT_PUBLIC_IDIOMA === 'en' ? 'en' : 'pt-BR'

export const idioma = (): Idioma => atual

/** Só para os testes: no site o idioma vem do build. */
export function definirIdioma(novo: Idioma): void {
  atual = novo
}

/** Escolhe, entre as versões de um conteúdo, a do idioma do build. */
export function escolher<T>(versoes: Record<Idioma, T>): T {
  return versoes[atual]
}

/** O nome de um uso legítimo de uma fase é uma chave de mensagem. Texto que não é chave passa como veio. */
export function tSeHouver(texto: string): string {
  return texto in dicionarios[atual] ? t(texto as Chave) : texto
}

export function t(chave: Chave, valores: Record<string, string | number> = {}): string {
  return dicionarios[atual][chave].replace(/\{(\w+)\}/g, (_, nome: string) => String(valores[nome] ?? `{${nome}}`))
}
