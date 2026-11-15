import type { NextConfig } from 'next'

// D12 e D15: site estático, sem nada exclusivo de um host. Nada de API Routes,
// Middleware, Server Actions, ISR ou otimização de imagem.
const config: NextConfig = {
  output: 'export',
  // A prova com emuladores exporta para outra pasta, para nunca se misturar com out/.
  distDir: process.env.SAIDA || '.next',
  images: { unoptimized: true },
  trailingSlash: true,
  // O typecheck roda à parte (npm run typecheck), no CI.
  typescript: { ignoreBuildErrors: true },
}

export default config
