import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Nuvem } from '../componentes/Nuvem'
import { idioma, t } from '../jogo/t'
import './globals.css'

export const metadata: Metadata = {
  title: `${t('marca.nome')} · ${t('marca.sigla')}`,
  description: t('marca.frase'),
  openGraph: { title: t('marca.nome'), description: t('marca.frase'), type: 'website', locale: idioma() === 'en' ? 'en_US' : 'pt_BR' },
}

export const viewport: Viewport = { themeColor: '#131314' }

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang={idioma()}>
      <body>
        {children}
        <Nuvem />
      </body>
    </html>
  )
}
