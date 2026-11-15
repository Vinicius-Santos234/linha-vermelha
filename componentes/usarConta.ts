import { useEffect, useState } from 'react'
import { aoMudarConta, conectar, contaAtual, nuvemConfigurada, sair as sairDaConta, vincularGoogle, type Conta } from '../jogo/conta'

/** A conta do jogador e o gesto de entrar com o Google, para o cabeçalho e para o perfil. */
export function usarConta() {
  const [conta, setConta] = useState<Conta | null>(null)
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    setConta(contaAtual())
    const parar = aoMudarConta(setConta)
    void conectar().catch(() => {})
    return parar
  }, [])

  const entrar = async () => {
    setEntrando(true)
    setErro('')
    try {
      await vincularGoogle()
    } catch (e) {
      // Fechar a janela do Google não é erro para mostrar.
      const codigo = (e as { code?: string }).code
      if (codigo !== 'auth/popup-closed-by-user' && codigo !== 'auth/cancelled-popup-request') setErro((e as Error).message)
    }
    setEntrando(false)
  }

  const sair = async () => {
    setEntrando(true)
    setErro('')
    try {
      await sairDaConta()
    } catch (e) {
      setErro((e as Error).message)
    }
    setEntrando(false)
  }

  // `entrando` vale para os dois gestos: enquanto a conta troca, os botões ficam parados.
  return { conta, configurada: nuvemConfigurada, entrando, erro, entrar, sair }
}
