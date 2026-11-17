import type { NextConfig } from 'next'

// D12 e D15: site estático, sem nada exclusivo de um host. Nada de API Routes,
// Middleware, Server Actions, ISR ou otimização de imagem.
// O site em inglês é este mesmo código, construído com NEXT_PUBLIC_IDIOMA=en e servido em /en/.
const ingles = process.env.NEXT_PUBLIC_IDIOMA === 'en'

const config: NextConfig = {
  output: 'export',
  basePath: ingles ? '/en' : undefined,
  // A prova com emuladores exporta para outra pasta, para nunca se misturar com out/.
  distDir: process.env.SAIDA || '.next',
  images: { unoptimized: true },
  trailingSlash: true,
  // O typecheck roda à parte (npm run typecheck), no CI.
  typescript: { ignoreBuildErrors: true },
}

export default config
