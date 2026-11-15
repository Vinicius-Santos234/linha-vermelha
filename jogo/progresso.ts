// Progresso do jogador: fases.{id}.{modo} = { estrelas, dicas, concluidaEm }.
// O navegador guarda sempre uma cópia. Com o Firebase configurado, jogo/nuvem.ts
// sincroniza essa cópia com o Firestore (progresso/{uid}).
export type Modo = 'ataque' | 'defesa' | 'ciclo'

export interface Conquista {
  estrelas: number
  dicas: number
  concluidaEm: string
}

export type Progresso = Record<string, Partial<Record<Modo, Conquista>>>

const CHAVE = 'linha-vermelha:progresso'

/** Três estrelas, menos uma por dica aberta, com mínimo de uma. */
export function estrelasPara(dicasAbertas: number): number {
  return Math.max(1, 3 - dicasAbertas)
}

/**
 * Junta dois progressos ficando com o máximo de estrelas por fase e modo. É o que
 * acontece quando quem jogou em dois aparelhos vincula os dois à mesma conta.
 */
export function mesclar(a: Progresso, b: Progresso): Progresso {
  const junto: Progresso = {}
  for (const fase of new Set([...Object.keys(a), ...Object.keys(b)])) {
    junto[fase] = {}
    for (const modo of new Set([...Object.keys(a[fase] ?? {}), ...Object.keys(b[fase] ?? {})]) as Set<Modo>) {
      const [x, y] = [a[fase]?.[modo], b[fase]?.[modo]]
      junto[fase][modo] = !y || (x && x.estrelas >= y.estrelas) ? x : y
    }
  }
  return junto
}

export function lerProgresso(): Progresso {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Progresso
  } catch {
    return {}
  }
}

const ouvintes = new Set<(progresso: Progresso) => void>()

/** Avisa quando o progresso muda, inclusive quando chega algo da nuvem. */
export function aoMudarProgresso(ouvinte: (progresso: Progresso) => void): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export function gravarProgresso(progresso: Progresso): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(progresso))
  } catch {
    // Navegação privada ou armazenamento bloqueado: o jogo segue sem guardar.
  }
  for (const ouvinte of ouvintes) ouvinte(progresso)
}

let enviarParaNuvem: ((progresso: Progresso) => void) | null = null

/** A nuvem se apresenta aqui quando conecta. Sem ela, o progresso fica só no navegador. */
export function ligarNuvem(enviar: ((progresso: Progresso) => void) | null): void {
  enviarParaNuvem = enviar
}

/** Guarda a conquista, sem nunca baixar as estrelas de quem já fez melhor. */
export function registrarVitoria(faseId: string, modo: Modo, dicasAbertas: number): Conquista {
  const nova: Conquista = { estrelas: estrelasPara(dicasAbertas), dicas: dicasAbertas, concluidaEm: new Date().toISOString() }
  const progresso = mesclar(lerProgresso(), { [faseId]: { [modo]: nova } })
  gravarProgresso(progresso)
  enviarParaNuvem?.(progresso)
  return progresso[faseId]![modo]!
}
