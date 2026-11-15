// Todo texto que o jogador lê mora em mensagens/<idioma>.json (D16), venha ele da tela,
// do motor ou do cliente supabase-js falso. Na v2 entra o en.json ao lado.
import mensagens from './pt-BR.json'

export type Chave = keyof typeof mensagens

export function t(chave: Chave, valores: Record<string, string | number> = {}): string {
  return mensagens[chave].replace(/\{(\w+)\}/g, (_, nome: string) => String(valores[nome] ?? `{${nome}}`))
}
