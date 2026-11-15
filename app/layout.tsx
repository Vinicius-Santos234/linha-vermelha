import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Nuvem } from '../componentes/Nuvem'
import { t } from '../jogo/t'
import './globals.css'

export const metadata: Metadata = {
  title: `${t('marca.nome')} · ${t('marca.sigla')}`,
  description: t('marca.frase'),
  openGraph: { title: t('marca.nome'), description: t('marca.frase'), type: 'website', locale: 'pt_BR' },
}

export const viewport: Viewport = { themeColor: '#131314' }

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Nuvem />
      </body>
    </html>
  )
}
