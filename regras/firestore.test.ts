// As Firestore Rules testadas no emulador. O jogo que ensina a testar política tem as
// próprias regras testadas. Uso: npm run prova:regras
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let ambiente: RulesTestEnvironment
const progresso = { fases: { '01-rls-desligado': { ataque: { estrelas: 3, dicas: 0, concluidaEm: '2026-11-15T00:00:00.000Z' } } }, atualizadoEm: new Date() }

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'demo-linha-vermelha',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(() => ambiente.cleanup())
beforeEach(async () => {
  await ambiente.clearFirestore()
  await ambiente.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'progresso/bruno'), progresso))
})

const como = (uid: string) => ambiente.authenticatedContext(uid).firestore()
const visitante = () => ambiente.unauthenticatedContext().firestore()

describe('progresso/{uid}', () => {
  it('o dono cria, lê e atualiza o próprio documento', async () => {
    await assertSucceeds(setDoc(doc(como('alice'), 'progresso/alice'), progresso))
    await assertSucceeds(updateDoc(doc(como('alice'), 'progresso/alice'), { fases: {} }))
    const lido = await assertSucceeds(getDoc(doc(como('alice'), 'progresso/alice')))
    expect(lido.data()?.fases).toEqual({})
  })

  it('ninguém lê o documento de outro jogador', async () => {
    await assertFails(getDoc(doc(como('alice'), 'progresso/bruno')))
    await assertFails(getDoc(doc(visitante(), 'progresso/bruno')))
    await assertSucceeds(getDoc(doc(como('bruno'), 'progresso/bruno')))
  })

  it('ninguém escreve no documento de outro jogador', async () => {
    await assertFails(setDoc(doc(como('alice'), 'progresso/bruno'), progresso))
    await assertFails(updateDoc(doc(como('alice'), 'progresso/bruno'), { fases: {} }))
    await assertFails(setDoc(doc(visitante(), 'progresso/bruno'), progresso))
    await assertFails(setDoc(doc(visitante(), 'progresso/qualquer'), progresso))
  })

  it('ninguém lista a coleção', async () => {
    await assertFails(getDocs(collection(como('alice'), 'progresso')))
    await assertFails(getDocs(collection(visitante(), 'progresso')))
  })

  it('o documento só aceita o progresso e a data', async () => {
    await assertFails(setDoc(doc(como('alice'), 'progresso/alice'), { ...progresso, admin: true }))
    await assertFails(setDoc(doc(como('alice'), 'progresso/alice'), { fases: 'tudo', atualizadoEm: new Date() }))
    await assertFails(setDoc(doc(como('alice'), 'progresso/alice'), { atualizadoEm: new Date() }))
  })

  it('nem o dono apaga o documento', async () => {
    await assertFails(deleteDoc(doc(como('bruno'), 'progresso/bruno')))
  })
})

describe('fora de progresso', () => {
  it('nada mais existe, nem para quem está logado', async () => {
    await assertFails(getDoc(doc(como('alice'), 'ranking/alice')))
    await assertFails(setDoc(doc(como('alice'), 'ranking/alice'), { pontos: 9999 }))
    await assertFails(setDoc(doc(como('alice'), 'progresso/alice/extras/x'), { a: 1 }))
  })
})
