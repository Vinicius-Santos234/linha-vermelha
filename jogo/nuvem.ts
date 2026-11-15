// Firebase: login anônimo na primeira visita, vínculo com o Google depois, e o
// progresso em progresso/{uid} no Firestore. Este arquivo só é carregado por import
// dinâmico, para o SDK não pesar na primeira tela, e só quando há configuração.
import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  type User,
} from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, initializeFirestore, persistentLocalCache, serverTimestamp, setDoc } from 'firebase/firestore'
import { gravarProgresso, lerProgresso, ligarNuvem, mesclar, type Progresso } from './progresso'

export interface Conta {
  uid: string
  anonima: boolean
  nome: string | null
}

// A chave de API do Firebase é pública por design: quem protege os dados são as Rules.
const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
})
const auth = getAuth(app)
// O cache local do SDK cobre conexão ruim: a escrita fica na fila e sobe depois.
const db = initializeFirestore(app, { localCache: persistentLocalCache() })

if (process.env.NEXT_PUBLIC_FIREBASE_EMULADORES) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

const contaDe = (usuario: User): Conta => ({ uid: usuario.uid, anonima: usuario.isAnonymous, nome: usuario.displayName ?? usuario.email })
const documento = () => doc(db, 'progresso', auth.currentUser!.uid)

async function enviar(progresso: Progresso): Promise<void> {
  if (!auth.currentUser) return
  await setDoc(documento(), { fases: progresso, atualizadoEm: serverTimestamp() })
}

/** Junta o que está no navegador com o que está na nuvem e grava o resultado nos dois. */
async function sincronizar(): Promise<void> {
  const remoto = ((await getDoc(documento())).data()?.fases ?? {}) as Progresso
  const junto = mesclar(lerProgresso(), remoto)
  gravarProgresso(junto)
  if (JSON.stringify(junto) !== JSON.stringify(remoto)) await enviar(junto)
}

let conexao: Promise<Conta> | null = null

/** Entra (anonimamente, se for a primeira visita) e sincroniza. Pode ser chamada à vontade. */
export function conectar(): Promise<Conta> {
  return (conexao ??= (async () => {
    const lembrado = await new Promise<User | null>((resolver) => {
      const parar = onAuthStateChanged(auth, (usuario) => {
        parar()
        resolver(usuario)
      })
    })
    const usuario = lembrado ?? (await signInAnonymously(auth)).user
    ligarNuvem((progresso) => void enviar(progresso).catch(() => {}))
    // Sem rede, o jogo segue com o que está no navegador e sincroniza na próxima visita.
    await sincronizar().catch(() => {})
    return contaDe(usuario)
  })())
}

/**
 * "Salvar progresso com Google". O vínculo mantém o mesmo uid, então nada se perde.
 * Se a conta Google já tem progresso de outro aparelho, entra nela e mescla ficando
 * com o máximo de estrelas por fase e modo.
 */
export async function vincularGoogle(): Promise<Conta> {
  await conectar()
  try {
    const { user } = await linkWithPopup(auth.currentUser!, new GoogleAuthProvider())
    conexao = Promise.resolve(contaDe(user))
  } catch (e) {
    const credencial = (e as { code?: string }).code === 'auth/credential-already-in-use' ? GoogleAuthProvider.credentialFromError(e as never) : null
    if (!credencial) throw e
    const { user } = await signInWithCredential(auth, credencial)
    await sincronizar()
    conexao = Promise.resolve(contaDe(user))
  }
  return conexao
}
